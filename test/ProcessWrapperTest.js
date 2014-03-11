var stubs = {
	path: {},
	"./LogRedirector": function() {
		this.once = function(event, func) {
			func();
		}
	},
	usage: {}
};

var should = require("should"),
	sinon = require("sinon"),
	path = require("path"),
	proxyquire = require("proxyquire");

describe("ProcessWrapper", function() {
	it("should set the process title", function(done) {
		var processTitle = "blah";

		stubs.path.resolve = sinon.stub();
		stubs.path.resolve.returns("/dev/null");

		process.env.BOSS_PROCESS_NAME = processTitle;
		process.nextTick = function(){};
		process.send = function(){};

		var ProcessWrapper = proxyquire(path.resolve(__dirname, "../lib/ProcessWrapper"), stubs);
		new ProcessWrapper();

		process.title.should.equal(processTitle);

		done();
	});

	it("should remove boss properties from the environment", function(done) {
		stubs.path.resolve = sinon.stub();
		stubs.path.resolve.returns("/dev/null");

		process.env.BOSS_TEST_PROPERTY = "foo";
		process.nextTick = function(){};
		process.send = function(){};

		var ProcessWrapper = proxyquire(path.resolve(__dirname, "../lib/ProcessWrapper"), stubs);
		new ProcessWrapper();

		should(process.env.BOSS_TEST_PROPERTY).be.undefined;

		done();
	});

	describe("_onUncaughtException", function() {
		it("should notify of uncaught exceptions", function(done) {
			process.send = sinon.stub();

			process.listeners = sinon.stub();
			process.listeners.withArgs("uncaughtException").returns([{}, {}]);

			var ProcessWrapper = proxyquire(path.resolve(__dirname, "../lib/ProcessWrapper"), stubs);
			var processWrapper = new ProcessWrapper();

			processWrapper._onUncaughtException({});

			process.send.callCount.should.equal(1);

			var event = process.send.getCall(0).args[0];
			event.type.should.equal("process:uncaughtexception");

			done();
		});
	});

	describe("_onMessage", function() {
		it("should survive bad messages", function(done) {
			process.send = sinon.stub();
			process.listeners = sinon.stub();
			process.listeners.withArgs("message").returns([{}, {}]);

			var ProcessWrapper = proxyquire(path.resolve(__dirname, "../lib/ProcessWrapper"), stubs);
			var processWrapper = new ProcessWrapper();

			process.emit("message");

			process.send.callCount.should.equal(0);

			process.emit("message", {});

			process.send.callCount.should.equal(0);

			done();
		});

		it("should delegate to message handler", function(done) {
			var ProcessWrapper = proxyquire(path.resolve(__dirname, "../lib/ProcessWrapper"), stubs);
			var processWrapper = new ProcessWrapper();
			processWrapper["foo:bar"] = sinon.stub();

			process.emit("message", {type: "foo:bar"});

			processWrapper["foo:bar"].callCount.should.equal(1);

			done();
		});
	});

	describe("boss:status", function() {
		it("should return process status", function(done) {
			process.send = sinon.stub();
			process.listeners = sinon.stub();
			process.listeners.withArgs("message").returns([{}, {}]);

			stubs.usage.lookup = sinon.stub();
			stubs.usage.lookup.callsArgWith(2, null, {cpu: 10});

			var ProcessWrapper = proxyquire(path.resolve(__dirname, "../lib/ProcessWrapper"), stubs);
			var processWrapper = new ProcessWrapper();

			processWrapper["boss:status"]({type: "boss:status"});

			process.send.callCount.should.equal(1);

			var event = process.send.getCall(0).args[0];
			event.type.should.equal("process:status");
			event.status.usage.cpu.should.equal(10);

			done();
		});
	});
})