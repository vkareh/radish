var expect = require('chai').expect;
var EventEmitter = require('events').EventEmitter;
var Redis = require('../lib/redis');
var Index = require('../lib/index');
var BaseIndexer = require('../indexers/base');
var MongoReader = require('../readers/mongo');

describe('lib/index', function() {
  before(function(done) {
    this.redis = new Redis();
    this.redis.select(15, done);
  });

  before(function() {
    this.indexer = new BaseIndexer(this.redis, {idAttribute: '_id', prefix: 'radish-test-index'});
    this.reader = new MongoReader({db: 'radish-test'});
  });

  it('should initialize a new index', function() {
    this.index = new Index(this.indexer, this.reader);
    expect(this.index.indexer).to.equal(this.indexer);
    expect(this.index.reader).to.equal(this.reader);
    expect(this.index.start).to.be.a.function;
    expect(this.index.stop).to.be.a.function;
    expect(this.index).to.be.an.instanceof(EventEmitter);
  });

  it('should listen to events from the reader', function(done) {
    var doc = this.doc = {foo: 'bar'};
    this.index.once('error', done);
    this.index.once('add', function(added) {
      expect(added).to.be.ok;
      expect(added).to.deep.equal(doc);
      done();
    });
    this.index.on('start', function() {
      this.reader.db.db('radish-test').collection('radish-test').insert(doc, function(err, result) {
        doc._id = result.ops[0]._id;
        if (err) return done(err);
      });
    }).start();
  });

  it('should synchronize reader data with the index', function(done) {
    var _this = this;
    this.index.indexer.get(this.doc._id.toString(), function(err, docs) {
      if (err) return done(err);
      expect(docs).to.be.an.instanceof(Array);
      expect(docs).to.have.length(1);
      expect(docs[0]).to.equal(_this.doc._id.toString());
      done();
    });
  });

  afterEach(function() {
    this.index.removeAllListeners();
    this.reader.removeAllListeners();
  });

  after(function(done) {
    this.timeout(10000);
    this.reader.db.db('radish-test').collection('radish-test').remove(done);
  });
});
