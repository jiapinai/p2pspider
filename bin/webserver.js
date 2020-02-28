'use strict';

/**
 * Web Server
 */

const site_title = 'Tordex';

/**
 *  Just in case.
 *  db.dropDatabase();
 **/
// db.dropDatabase();


/**
 * Setting the trackers.
 * Very handy repo below.
 * https://github.com/ngosang/trackerslist
 */
const trackers = () => {
    let string = '&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969 ' +
        '&tr=udp%3A%2F%2Fp4p.arenabg.com%3A1337' +
        '&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337' +
        '&tr=udp%3A%2F%2Ftracker.skyts.net%3A6969' +
        '&tr=udp%3A%2F%2Ftracker.safe.moe%3A6969' +
        '&tr=udp%3A%2F%2Ftracker.piratepublic.com%3A1337';
    return string;
};

/**
 * Mongoose / MongoDB
 */
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const mongoDB = 'mongodb://mongo:27017/magnetdb';
mongoose.connection.openUri(mongoDB);
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => { console.log('MongoDB has connected.'); });

const magnetSchema = mongoose.Schema({
    name: { type: String, index: true },
    infohash: { type: String, index: true },
    magnet: String,
    fetchedAt: Number
});

const Magnet = mongoose.model('Magnet', magnetSchema, "magnetdb");

/**
 * Express / Web App
 */
const express = require('express');
const path = require('path');
const app = express();
const basicAuth = require('express-basic-auth');
const webtorrentHealth = require('webtorrent-health');

app.set('view engine', 'pug');
app.use('/public', express.static(path.join(__dirname + '/public')));

/**
 * Basic Auth
 * You can comment this section out to disable it.
 * Or use nginx/apache rules... Whichever you prefer.
 */

/**
 * Commented out by default now.
app.use(basicAuth({
  users: {
    'username': 'password',
    'username': 'password',
  },
  challenge: true,
  realm: 'Secret Place'
}));
**/

/**
 * Console log IP's requesting info and url.
 */
app.use((req, res, next) => {
    res.locals.ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log('\x1b[36m%s\x1b[0m', 'FROM: ' + res.locals.ip + ' ON: ' + req.originalUrl);
    next();
});

if (app.get('env') === 'development') {
    app.locals.pretty = true;
};

/**
 * Routing / Pages
 */
app.get('/', (req, res) => {
    Magnet.count({}, (err, count) => {
        // format number with commas
        let localecount = count.toLocaleString();
        // render home page
        res.render(
            'index', { title: site_title, count: localecount }
        );
    });
});

// Latest page.
app.get('/latest', (req, res) => {
    let start = new Date().valueOf();
    Magnet.find({}, (err, results) => {
            let stop = new Date().valueOf();
            let timer = (stop - start);
            res.render(
                'search', { title: site_title, results: results, trackers: trackers(), timer: timer }
            );
        })
        .lean()
        .limit(25)
        .sort({ 'fetchedAt': -1 });
});

// Statistics page.
app.get('/statistics', (req, res) => {
    db.db.stats({ scale: 1048576 }, (err, stats) => {
        res.render(
            'statistics', { title: site_title, statistics: stats }
        );
    });
});

// Individual magnet page.
app.get('/infohash', (req, res) => {
    let start = new Date().valueOf();
    let infohash = new RegExp(req.query.q, 'i');
    // It its not the right length.
    if (req.query.q.length !== 40) {
        // display error
        res.render(
            'error', { title: site_title, error: "Incorrect infohash length." }
        );
    } else {
        // find search query
        Magnet.find({ infohash: infohash }, (err, results) => {
                let stop = new Date().valueOf();
                let timer = (stop - start);
                let health = [];

                for (let result in results) {
                    let magnet = results[result].magnet + trackers();
                    webtorrentHealth(magnet).then((data) => {
                        res.render(
                            'single', { title: site_title, result: results, trackers: trackers(), timer: timer, health: data }
                        );
                    }).catch(console.error.bind(console))
                }
            })
            .lean()
            .limit(1)
    };
});

// The actual search query block.
app.get('/search', (req, res) => {
    if (!req.query.q) {
        // display search page if nothing queried.
        res.render(
            'searchform', { title: site_title }
        );
    } else {
        let searchqueryregex = new RegExp(req.query.q, 'i');
        // wasn't long enough query.
        if (req.query.q.length < 3) {
            // display error
            res.render(
                'error', { title: site_title, error: "You must type a longer search query." }
            );
        } else {
            // find actual search query
            const options = {
                page: req.query.p || 0,
                limit: 10
            };
            // if its an infohash
            if (req.query.q.length === 40) {
                // count total, then start pagination
                let start = new Date().valueOf();
                Magnet.count({ infohash: searchqueryregex }, (err, count) => {
                    Magnet.find({ infohash: searchqueryregex })
                        .skip(options.page * options.limit)
                        .limit(options.limit)
                        .lean()
                        .exec((err, results) => {
                            let health = [];
                            for (let result in results) {
                                let magnet = results[result].magnet + trackers();
                                webtorrentHealth(magnet).then((data) => {
                                    health = data;
                                }).catch(console.error.bind(console))
                            }
                            // a little organizing for page variables
                            let pages = {};
                            pages.query = searchqueryregex.toString().split('/')[1];
                            pages.results = count;
                            pages.available = Math.ceil((count / options.limit) - 1);
                            pages.current = parseInt(options.page);
                            pages.previous = pages.current - 1;
                            pages.next = pages.current + 1;
                            let stop = new Date().valueOf();
                            let timer = (stop - start);
                            // render our paginated feed of magnets
                            res.render(
                                'search', { title: site_title, results: results, trackers: trackers(), pages: pages, timer: timer, health: data }
                            );
                        });
                });
            } else {
                // if its just a search string
                // count total, then start pagination
                let start = new Date().valueOf();
                Magnet.count({ name: searchqueryregex }, (err, count) => {
                    Magnet.find({ name: searchqueryregex })
                        .skip(options.page * options.limit)
                        .limit(options.limit)
                        .lean()
                        .exec((err, results) => {
                            // a little organizing for page variables
                            let pages = {};
                            pages.query = searchqueryregex.toString().split('/')[1];
                            pages.results = count;
                            pages.available = Math.ceil((count / options.limit) - 1);
                            pages.current = parseInt(options.page);
                            pages.previous = pages.current - 1;
                            pages.next = pages.current + 1;
                            let stop = new Date().valueOf();
                            let timer = (stop - start);
                            // render our paginated feed of magnets
                            res.render(
                                'search', { title: site_title, results: results, trackers: trackers(), pages: pages, timer: timer }
                            );
                        });
                });
            };
        };
    };
});

app.get('/api/count', (req, res) => {
    Magnet.count({}, (err, count) => {
        // format number with commas
        let localecount = count.toLocaleString();
        // send the count
        res.send(localecount);
    }).lean();
});

/**
 * Start Express
 */
app.listen(8080, () => {
    console.log('Webserver is listening on port 8080!');
});