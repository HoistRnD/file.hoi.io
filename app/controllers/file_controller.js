'use strict';
var azure = require('azure'),
  hoist = require('hoist-core'),
  q = hoist.q,
  config = hoist.utils.defaults;

var FileController = function () {

};
FileController.prototype = {
  upload: function (req, res) {
    var member = req.session.passport.member;
    var environment = req.environment;
    hoist.auth.helpers.files.canSave(member, environment)
      .then(function () {
        return azure.createBlobService(config.azure.storage.account, config.azure.storage.key);
      }).then(function (blobService) {

        return q.ninvoke(blobService, 'createContainerIfNotExists', req.application.fileBucket.toLowerCase() + '-' + environment.token)
          .then(function () {
            var file = req.files['file'];
            if (!file) {
              throw new Error("file wasn't specififed");
            }
            var options = {
              metadata: req.body || {}
            };
            return q.ninvoke(blobService, 'createBlockBlobFromFile',
              req.application.fileBucket.toLowerCase() + '-' + environment.token,
              req.params['id'],
              file.path,
              options

            ).then(function () {
              return req.params['id'];
            });
          });
      }).then(function () {
        res.send({
          status: "ok",
          fileId: req.params['id']
        });
      }).fail(function (err) {
        hoist.error(err);
        res.send(500, {
          "message": err.message
        });
      }).done();
  },
  get: function (req, res) {
    var member = req.session.passport.member;
    var environment = req.environment;
    hoist.auth.helpers.files.canGet(member, environment)
      .then(function () {
        return azure.createBlobService(config.azure.storage.account, config.azure.storage.key);
      }).then(function (blobService) {
        return q.ninvoke(blobService, 'getBlobProperties', req.application.fileBucket.toLowerCase() + '-' + environment.token, req.params.id)
          .then(function (blobInfo) {
            blobInfo = blobInfo[0];
            res.header('content-type', blobInfo.contentType);
            res.header('content-disposition', 'attachment; filename=' + blobInfo.metadata.filename);
            return q.ninvoke(blobService, 'getBlobToStream', req.application.fileBucket.toLowerCase() + '-' + environment.token, req.params.id, res);
          });
      }).fail(function (err) {
        hoist.error(err);
        res.send(err.statusCode || 500, {
          "message": err.message
        });
      }).done();
  }
};
module.exports = new FileController();
