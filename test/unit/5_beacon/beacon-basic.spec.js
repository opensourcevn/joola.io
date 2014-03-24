describe("beacon-basic", function () {
  before(function (done) {
    this.context = {user: _token.user};
    this.uid = global.uid;
    this.collection = 'test-collection-basic-' + this.uid;

    this.documents = require('../../fixtures/basic.json');
    done();
  });

  it("should load a single document", function (done) {
    var self = this;
    joola.beacon.insert(this.context, this.context.user.workspace, this.collection, ce.clone(this.documents[0]), function (err, doc) {
      self.dup = doc[0].timestamp;
      doc = doc[0];

      done(err);
    });
  });

  it("should fail loading a duplicate single document", function (done) {
    var doc = ce.clone(this.documents[0]);
    doc.timestamp = this.dup;
    joola.beacon.insert(this.context, this.context.user.workspace, this.collection, doc, function (err, doc) {
      doc = doc[0];

      expect(doc.saved).to.equal(false);
      done();
    });
  });

  it("should load array of documents", function (done) {
    var self = this;
    var docs = ce.clone(self.documents);
    var counter = 0;
    docs.forEach(function (d) {
      d.timestamp = new Date();
      d.timestamp.setMilliseconds(d.timestamp.getMilliseconds() - counter);
      counter++;
    });
    joola.beacon.insert(self.context, self.context.user.workspace, self.collection, docs, function (err, docs) {
      if (err)
        return done(err);

      docs.forEach(function (d) {

        expect(d.saved).to.equal(true);
      });
      done();
    });

  });

  it("should fail loading documents with no timestamp", function (done) {
    var documents = [
      {"visitors": 2}
    ];
    joola.beacon.insert(this.context, this.context.user.workspace, this.collection + '-nots', documents, function (err) {
      if (!err)
        return done(new Error('This should have failed'));
      done();
    });
  });
});