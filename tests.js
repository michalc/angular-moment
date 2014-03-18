/* License: MIT.
 * Copyright (C) 2013, 2014, Uri Shaked.
 */

/* global describe, inject, module, beforeEach, afterEach, it, expect, spyOn, moment */

'use strict';

describe('moment factory', function () {
	var moment;
	var fake = {};

	beforeEach(module('angularMoment', function($provide) {
		$provide.value('$window', {
			'moment': fake
		});
	}));

	beforeEach(inject(function (_moment_) {
		moment = _moment_;
	}));

	it('should return $window.moment', function () {
		expect(moment).toBe(fake);
	});
});

describe('amTimeAgo Directive', function() {
	var $rootScope, $compile, mockMomentFactory, moment;

	/* Empty definitions so each test can override */
	function MockMoment(arg1, arg2) {
		this._arg1 = arg1;
		this._arg2 = arg2;
	};
	MockMoment.prototype.fromNow = function() {};
	MockMoment.prototype.diff = function() {};

	mockMomentFactory = function(dateOrMoment, format) {
		var mockMoment = new MockMoment(dateOrMoment, format);
		return mockMoment;
	}

	var amTimeAgoElement = function(date) {;
		$rootScope.date = date;
		var element = angular.element('<span am-time-ago="date"></span>');
		element = $compile(element)($rootScope);
		$rootScope.$digest();
		return element;
	}

	var simulateDateChange = function(newDate) {
		$rootScope.date = newDate;
		$rootScope.$digest();
	}

	beforeEach(module('angularMoment', function($provide) {
		$provide.value('$window', {
			'moment': function(dateOrMoment, format) {
				return mockMomentFactory(dateOrMoment, format);
			}
		});
	}));

  beforeEach(inject(function (_$rootScope_, _$compile_, _moment_) {
    moment = _moment_;
    $rootScope = _$rootScope_;
    $compile = _$compile_;
  }));

	it('should change the text of the element to moment([anything non null]).fromNow()', function () {
		var mockFromNowText = 'test-from-now-text';
		MockMoment.prototype.fromNow = function() {
			return mockFromNowText;
		}
		var element = amTimeAgoElement({});
		expect(element.text()).toBe(mockFromNowText);
	});

	it('should change the text of the element to moment(passedDate).fromNow()', function () {
		var mockFromNowText = 'test-from-now-text';
		MockMoment.prototype.fromNow = function() {
			return this._arg1;
		}
		var element = amTimeAgoElement(mockFromNowText);
		expect(element.text()).toBe(mockFromNowText);
	});

	it('should update the value if date changes on scope', function () {
		var mockDate = 'test-initial-date';
		var changedDate = 'test-changed-date';
		MockMoment.prototype.fromNow = function() {
			return mockDate;
		}
		var element = amTimeAgoElement(mockDate);
		mockDate = changedDate;
		simulateDateChange(mockDate);
		expect(element.text()).toBe(changedDate);
	});

	angular.forEach([null, undefined, ''], function(empty) {
		it('should not throw an exception for date of ' + empty, function () {
			var mockDate = empty;
			expect(function() {
				var element = amTimeAgoElement(mockDate);
			}).not.toThrow();
		});
		it('should show empty date for date of ' + empty, function () {
			var mockDate = empty;
			var element = amTimeAgoElement(mockDate);
			expect(element.text()).toBe('');
		});
	});
});


describe('module angularMoment', function () {

	var $rootScope, $compile, $window, $filter, $timeout, amTimeAgoConfig, originalTimeAgoConfig, angularMomentConfig,
		originalAngularMomentConfig, amMoment;

	beforeEach(module('angularMoment'));

	beforeEach(inject(function ($injector) {
		$rootScope = $injector.get('$rootScope');
		$compile = $injector.get('$compile');
		$window = $injector.get('$window');
		$filter = $injector.get('$filter');
		$timeout = $injector.get('$timeout');
		amMoment = $injector.get('amMoment');
		amTimeAgoConfig = $injector.get('amTimeAgoConfig');
		angularMomentConfig = $injector.get('angularMomentConfig');
		originalTimeAgoConfig = angular.copy(amTimeAgoConfig);
		originalAngularMomentConfig = angular.copy(angularMomentConfig);

		// Ensure the language of moment.js is set to english by default
		$window.moment.lang('en');
	}));

	afterEach(function () {
		// Restore original configuration after each test
		angular.copy(originalTimeAgoConfig, amTimeAgoConfig);
		angular.copy(originalAngularMomentConfig, angularMomentConfig);
	});

	// Add a sample timezone for tests
	moment.tz.add({
		zones: {
			'Pacific/Tahiti': ['-9:58:16 - LMT 1912_9 -9:58:16', '-10 - TAHT']
		}
	});

	describe('am-time-ago directive', function () {
		it('should update the span text as time passes', function (done) {
			$rootScope.testDate = new Date(new Date().getTime() - 44000);
			var element = angular.element('<div am-time-ago="testDate"></div>');
			element = $compile(element)($rootScope);
			$rootScope.$digest();
			expect(element.text()).toBe('a few seconds ago');

			var waitsInterval = setInterval(function () {
				if (new Date().getTime() - $rootScope.testDate.getTime() <= 45000) {
					return;
				}

				clearInterval(waitsInterval);
				$timeout.flush();
				$rootScope.$digest();
				expect(element.text()).toBe('a minute ago');
				done();
			}, 50);
		});

		it('should remove the element text and cancel the timer when an empty string is given (#15)', function () {
			$rootScope.testDate = new Date().getTime();
			var element = angular.element('<div am-time-ago="testDate"></div>');
			element = $compile(element)($rootScope);
			$rootScope.$digest();
			expect(element.text()).toBe('a few seconds ago');
			$rootScope.testDate = '';
			spyOn($timeout, 'cancel').and.callThrough();
			$timeout.flush();
			$rootScope.$digest();
			expect($timeout.cancel).toHaveBeenCalled();
			expect(element.text()).toBe('');
		});

		it('should not change the contents of the element until a date is given', function () {
			$rootScope.testDate = null;
			var element = angular.element('<div am-time-ago="testDate">Initial text</div>');
			element = $compile(element)($rootScope);
			$rootScope.$digest();
			expect(element.text()).toBe('Initial text');
			$rootScope.testDate = new Date().getTime();
			$rootScope.$digest();
			expect(element.text()).toBe('a few seconds ago');
		});

		it('should cancel the timer when the scope is destroyed', function () {
			var scope = $rootScope.$new();
			$rootScope.testDate = new Date();
			var element = angular.element('<span am-time-ago="testDate"></span>');
			element = $compile(element)(scope);
			$rootScope.$digest();
			spyOn($timeout, 'cancel').and.callThrough();
			scope.$destroy();
			expect($timeout.cancel).toHaveBeenCalled();
		});

		it('should generate a time string without suffix when configured to do so', function () {
			amTimeAgoConfig.withoutSuffix = true;
			$rootScope.testDate = new Date();
			var element = angular.element('<span am-time-ago="testDate"></span>');
			element = $compile(element)($rootScope);
			$rootScope.$digest();
			expect(element.text()).toBe('a few seconds');
		});

		it('should generate update the text following a language change via amMoment.changeLanguage() method', function () {
			$rootScope.testDate = new Date();
			var element = angular.element('<span am-time-ago="testDate"></span>');
			element = $compile(element)($rootScope);
			$rootScope.$digest();
			expect(element.text()).toBe('a few seconds ago');
			amMoment.changeLanguage('fr');
			expect(element.text()).toBe('il y a quelques secondes');
		});

		describe('am-without-suffix attribute', function () {
			it('should generate a time string without suffix when true', function () {
				$rootScope.testDate = new Date();
				var element = angular.element('<span am-time-ago="testDate" am-without-suffix="true"></span>');
				element = $compile(element)($rootScope);
				$rootScope.$digest();
				expect(element.text()).toBe('a few seconds');
			});

			it('should generate a time string with suffix when false', function () {
				amTimeAgoConfig.withoutSuffix = true;
				$rootScope.testDate = new Date();
				var element = angular.element('<span am-time-ago="testDate" am-without-suffix="false"></span>');
				element = $compile(element)($rootScope);
				$rootScope.$digest();
				expect(element.text()).toBe('a few seconds ago');
			});

			it('should support expressions', function () {
				$rootScope.testDate = new Date();
				$rootScope.withSuffix = false;
				var element = angular.element('<span am-time-ago="testDate" am-without-suffix="!withSuffix"></span>');
				element = $compile(element)($rootScope);
				$rootScope.$digest();
				expect(element.text()).toBe('a few seconds');
				$rootScope.withSuffix = true;
				$rootScope.$digest();
				expect(element.text()).toBe('a few seconds ago');
			});

			it('should ignore non-boolean values', function () {
				$rootScope.testDate = new Date();
				$rootScope.withoutSuffix = 'string';
				var element = angular.element('<span am-time-ago="testDate" am-without-suffix="withoutSuffix"></span>');
				element = $compile(element)($rootScope);
				$rootScope.$digest();
				expect(element.text()).toBe('a few seconds ago');
			});
		});

		describe('am-format attribute', function () {
			it('should support custom date format', function () {
				var today = new Date();
				$rootScope.testDate = today.getFullYear() + '#' + today.getDate() + '#' + today.getMonth();
				var element = angular.element('<span am-time-ago="testDate" am-format="YYYY#DD#MM"></span>');
				element = $compile(element)($rootScope);
				$rootScope.$digest();
				expect(element.text()).toBe('a month ago');
			});

			it('should support angular expressions in date format', function () {
				var today = new Date();
				$rootScope.testDate = today.getMonth() + '@' + today.getFullYear() + '@' + today.getDate();
				var element = angular.element('<span am-time-ago="testDate" am-format="{{dateFormat}}"></span>');
				element = $compile(element)($rootScope);
				$rootScope.$digest();
				$rootScope.dateFormat = 'MM@YYYY@DD';
				$rootScope.$digest();
				expect(element.text()).toBe('a month ago');
			});
		});
	});

	describe('amCalendar filter', function () {
		var amCalendar;

		beforeEach(function () {
			amCalendar = $filter('amCalendar');
		});

		it('should convert today date to calendar form', function () {
			var today = new Date();
			var testDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 13, 33, 33);
			expect(amCalendar(testDate)).toBe('Today at 1:33 PM');
		});

		it('should convert date in long past to calendar form', function () {
			expect(amCalendar(new Date(2012, 2, 25, 13, 14, 15))).toBe('03/25/2012');
		});

		it('should gracefully handle undefined values', function () {
			expect(amCalendar()).toBe('');
		});

		it('should accept a numeric unix timestamp (milliseconds since the epoch) as input', function () {
			expect(amCalendar(new Date(2012, 0, 22, 4, 46, 54).getTime())).toBe('01/22/2012');
		});

		it('should respect the configured timezone', function () {
			angularMomentConfig.timezone = 'Pacific/Tahiti';
			expect(amCalendar(Date.UTC(2012, 0, 22, 4, 46, 54))).toBe('01/21/2012');
		});

		it('should gracefully handle the case where timezone is given but moment-timezone is not loaded', function () {
			angularMomentConfig.timezone = 'Pacific/Tahiti';
			var originalMomentTz = moment.fn.tz;
			try {
				delete moment.fn.tz;
				expect(amCalendar(Date.UTC(2012, 0, 22, 4, 46, 54))).toBe('01/22/2012');
			} finally {
				moment.fn.tz = originalMomentTz;
			}
		});

		it('should return an empty string for invalid input', function () {
			expect(amCalendar('blah blah')).toBe('');
		});
	});

	describe('amDateFormat filter', function () {
		var amDateFormat;

		beforeEach(function () {
			amDateFormat = $filter('amDateFormat');
		});

		it('should support displaying format', function () {
			var today = new Date();
			var expectedResult = today.getDate() + '.' + (today.getMonth() + 1) + '.' + today.getFullYear();
			expect(amDateFormat(today, 'D.M.YYYY')).toBe(expectedResult);
		});

		it('should gracefully handle undefined values', function () {
			expect(amDateFormat(undefined, 'D.M.YYYY')).toBe('');
		});

		it('should accept a numeric unix timestamp (milliseconds since the epoch) as input', function () {
			var timestamp = new Date(2012, 0, 22, 12, 46, 54).getTime();
			expect(amDateFormat(timestamp, '(HH,mm,ss);MM.DD.YYYY')).toBe('(12,46,54);01.22.2012');
		});

		it('should gracefully handle string unix timestamp as input', function () {
			var strTimestamp = String(new Date(2012, 0, 22, 12, 46, 54).getTime());
			expect(amDateFormat(strTimestamp, '(HH,mm,ss);MM.DD.YYYY')).toBe('(12,46,54);01.22.2012');
		});

		it('should respect the configured timezone', function () {
			angularMomentConfig.timezone = 'Pacific/Tahiti';
			var timestamp = Date.UTC(2012, 0, 22, 12, 46, 54);
			expect(amDateFormat(timestamp, '(HH,mm,ss);MM.DD.YYYY')).toBe('(02,46,54);01.22.2012');
		});

		it('should return an empty string for invalid input', function () {
			expect(amDateFormat('blah blah', '(HH,mm,ss);MM.DD.YYYY')).toBe('');
		});
	});

	describe('amDurationFormat filter', function () {
		var amDurationFormat;

		beforeEach(function () {
			amDurationFormat = $filter('amDurationFormat');
		});

		it('should support return the given duration as text', function () {
			expect(amDurationFormat(1000, 'milliseconds')).toBe('a few seconds');
		});

		it('should support return a day given 24 hours', function () {
			expect(amDurationFormat(24, 'hours')).toBe('a day');
		});

		it('should add prefix the result with the word "in" if the third parameter (suffix) is true', function () {
			expect(amDurationFormat(1, 'minutes', true)).toBe('in a minute');
		});

		it('should add suffix the result with the word "ago" if the duration is negative and the third parameter is true', function () {
			expect(amDurationFormat(-1, 'minutes', true)).toBe('a minute ago');
		});

		it('should gracefully handle undefined values for duration', function () {
			expect(amDurationFormat(undefined, 'minutes')).toBe('');
		});
	});

	describe('amMoment service', function () {
		describe('#changeLanguage', function () {
			it('should return the current language', function () {
				expect(amMoment.changeLanguage()).toBe('en');
			});

			it('should broadcast an angularMoment:languageChange event on the root scope if a language is specified', function () {
				var eventBroadcasted = false;
				$rootScope.$on('amMoment:languageChange', function () {
					eventBroadcasted = true;
				});
				amMoment.changeLanguage('fr');
				expect(eventBroadcasted).toBe(true);
			});

			it('should not broadcast an angularMoment:languageChange event on the root scope if no language is specified', function () {
				var eventBroadcasted = false;
				$rootScope.$on('amMoment:languageChange', function () {
					eventBroadcasted = true;
				});
				amMoment.changeLanguage();
				expect(eventBroadcasted).toBe(false);
			});
		});
	});

	describe('amTimeAgoConfig constant', function () {
		it('should generate time with suffix by default', function () {
			expect(amTimeAgoConfig.withoutSuffix).toBe(false);
		});
	});

	describe('angularMomentConfig constant', function () {
		it('should have an empty timezone value by default', function () {
			expect(angularMomentConfig.timezone).toBe('');
		});
	});
});