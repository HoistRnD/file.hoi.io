'use strict';
var passport = require('passport'),
    multipart = require('connect-multiparty'),
    multipartMiddleware = multipart();

module.exports = function(app) {
    app.get('/ping', function(req, res) {
        res.send({
            ok: true,
            node: process.env.NODE_NAME,
            port: process.env.PORT
        });
    });
    var fileController = require('../controllers/file_controller');
    app.post('/:id', multipartMiddleware, passport.authenticate('hoist'), fileController.upload);
    app.get('/:id', passport.authenticate('hoist'), fileController.get);
    app.options('*', function(req, res) {
        res.send("ok");
    });

};
