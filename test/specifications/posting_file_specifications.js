'use strict';
var hoist = require('hoist-core'),
	fixtures = require('hoist-core/test/fixtures/entities'),
	Application = hoist.models.Application,
	Organisation = hoist.models.Organisation,
	app = require("../../app"),
	request = require('supertest'),
	http = require('http'),
	q = hoist.q,
	azure = require('azure');

describe('posting a file', function() {
	describe('against an existing application', function() {
		describe('against a new key and new container', function() {
			var _responseRecieved;

			var createContainerCall = {};
			var createBlockBlobFromFileCall;
			var mockBlobService = {
				createContainerIfNotExists: function(containerName, callback) {
					createContainerCall = {
						called: true,
						args: arguments
					};
					callback();
				},
				createBlockBlobFromFile: function(containerName, id, filePath, metaData, callback) {
					createBlockBlobFromFileCall = {
						called: true,
						args: arguments
					};
					callback();
				}
			};
			//var blobCreateCalled = {};

			before(function() {
				azure.oldCreateBlobService = azure.createBlobService;
				azure.createBlobService = function() {
					return mockBlobService;
				};

				_responseRecieved = q.all([
					new Organisation(fixtures.organisation).saveQ(),
					new Application(fixtures.application).saveQ()
				]).then(function() {
					var r = request(http.createServer(app))
						.post('/my_file')
						.set('Authorization', 'Hoist ' + fixtures.application.apiKey)
						.set('Accept', 'application/json')
						.attach('file', 'test/fixtures/Hoist_Logo.jpg');
					return q.ninvoke(r, "end");
				});

			});
			it('should create a new container', function() {
				return _responseRecieved.then(function() {
					createContainerCall.called.should.eql(true);
				});
			});
			it('should create the correct container name', function() {
				return _responseRecieved.then(function() {
					createContainerCall.args[0].should.eql(fixtures.application.fileBucket.toLowerCase()+'-'+fixtures.application.environments[0].token);
				});
			});
			it('should create an azure blob', function() {
				return _responseRecieved.then(function() {
					createBlockBlobFromFileCall.called.should.eql(true);
				});
			});
			it('should create an azure blob with correct id', function() {
				return _responseRecieved.then(function() {
					createBlockBlobFromFileCall.args[1].should.eql('my_file');
				});
			});
			it('should create an azure blob within correct container', function() {
				return _responseRecieved.then(function() {
					createBlockBlobFromFileCall.args[0].should.eql(fixtures.application.fileBucket.toLowerCase()+'-'+fixtures.application.environments[0].token);
				});
			});
			it('should return 200 response', function() {
				return _responseRecieved.then(function(response) {
					response.statusCode.should.equal(200);
				});
			});
			after(function(done) {
				azure.createBlobService = azure.oldCreateBlobService;
				Application.remove({}, function() {
					Organisation.remove({}, done);
				});

			});
		});
	});
	describe('against a non existant application', function() {
		var _responseRecieved;

		before(function() {
			_responseRecieved = q.all([
				new Organisation(fixtures.organisation).saveQ(),
				new Application(fixtures.application).saveQ()
			])
				.then(function() {
					var r = request(http.createServer(app))
						.post('/my_file')
						.set('Authorization', 'Hoist notValid')
						.set('Accept', 'application/json')
						.attach('file', 'test/fixtures/Hoist_Logo.jpg');
					return q.ninvoke(r, "end");
				});

		});
		it('should return a 401 response', function() {
			return _responseRecieved.then(function(response) {
				response.statusCode.should.equal(401);
			});
		});
		after(function(done) {
			Organisation.remove({}, function() {
				Application.remove({}, done);
			});

		});
	});
});
