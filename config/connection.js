const { MongoClient } = require('mongodb');


const state = {
    db: null
};

module.exports.connect = function(done) {
    const url = 'mongodb://localhost:27017';
    const dbName = 'FullMoto';

    const client = new MongoClient(url, { useUnifiedTopology: true });

    client.connect((err) => {
        if (err) return done(err);
        state.db = client.db(dbName);
        done();
    });
};

module.exports.get = function() {
    return state.db;
};
