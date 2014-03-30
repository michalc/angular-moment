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
	var $rootScope, $compile, $timeout, mockMomentFactory, moment;

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

	var setMockMomentFactory = function(newMockMomentFactory) {
		mockMomentFactory = newMockMomentFactory;
	}

	var amTimeAgoElement = function(date, initialText, initialScope) {
		var scope = initialScope || $rootScope;
		scope.date = date;
		var element = angular.element('<span am-time-ago="date">' + (initialText || '') +'</span>');
		element = $compile(element)(scope);
		scope.$digest();
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

  beforeEach(inject(function (_$rootScope_, _$compile_, _$timeout_, _moment_) {
    moment = _moment_;
    $rootScope = _$rootScope_;
    $compile = _$compile_;
    $timeout = _$timeout_;
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

	var empties = [null, undefined, ''];
	angular.forEach(empties, function(empty) {
		it('should not throw an exception for date of ' + angular.toJson(empty), function () {
			var mockDate = empty;
			expect(function() {
				var element = amTimeAgoElement(mockDate);
			}).not.toThrow();
		});
		it('should show empty string for date of ' + angular.toJson(empty), function () {
			var mockDate = empty;
			var element = amTimeAgoElement(mockDate);
			expect(element.text()).toBe('');
		});
		it('should show empty string when date changed from valid to ' + angular.toJson(empty), function() {
			var mockDate = 'test-date';
			MockMoment.prototype.fromNow = function() {
				return mockDate;
			}
			var element = amTimeAgoElement({});
			expect(element.text()).toBe(mockDate);
			simulateDateChange(empty);
			expect(element.text()).toBe('');
		});
		it('should cancel timer when date changed from valid to ' + angular.toJson(empty), function() {
			var element = amTimeAgoElement({});
			spyOn($timeout, 'cancel').and.callThrough();
			simulateDateChange(empty);
			expect($timeout.cancel).toHaveBeenCalled();
		});
		it('should not change the contents of the element until a date changed from ' + angular.toJson(empty), function() {
			var mockDate = 'test-date';
			var initialText = 'Initial contents';
			MockMoment.prototype.fromNow = function() {
				return mockDate;
			}			
			var element = amTimeAgoElement(empty, initialText);
			expect(element.text()).toBe(initialText);
			simulateDateChange({});
			expect(element.text()).toBe(mockDate);
		});
	});

	angular.forEach(empties, function(empty) {
		describe('when date is ' + angular.toJson(empty), function() {
			var mockMoment, mockDate, oldFactory;

			beforeEach(function() {
				mockDate = empty;
				mockMoment = new MockMoment();
				spyOn(mockMoment, 'fromNow');
				oldFactory = mockMomentFactory;
				setMockMomentFactory(function(dateOrMoment, moment) {
					return mockMoment;
				});
			})

			it('should not have called moment().fromNow()', function() {
				var mockDate = empty;
				var element = amTimeAgoElement(mockDate);
				expect(mockMoment.fromNow).not.toHaveBeenCalled();
			});

			afterEach(function() {
				setMockMomentFactory(oldFactory);
			});
		});
	});
	describe('timeout behaviour', function() {
		var testTimePassed = function(minutesAgo, whenChangeTime) {
			var originalMockFromNowText = 'original-from-now-text';
			var newMockFromNowText = 'new-from-now-text';
			var mockFromNowText = originalMockFromNowText;
			MockMoment.prototype.fromNow = function() {
				return mockFromNowText;
			}
			MockMoment.prototype.diff = function() {
				return minutesAgo;
			}
			var element = amTimeAgoElement({});
			expect(element.text()).toBe(originalMockFromNowText);
			mockFromNowText = newMockFromNowText;
			$timeout.flush((whenChangeTime - 1) * 1000);
			expect(element.text()).toBe(originalMockFromNowText);
      $timeout.flush(1 * 1000);
      expect(element.text()).toBe(newMockFromNowText);
		};

		it('should not change text until 3600 seconds passed when time is less than 300 minutes ago', function() {
			testTimePassed(299, 3600);
		});
		it('should not change text until 300 seconds passed when time is less than 180 minutes ago', function() {
			testTimePassed(180, 300);
		});
		it('should not change text until 30 seconds passed when time is less than 60 minutes ago', function() {
			testTimePassed(60, 30);
		});
		it('should change text every second when time is less than a minute ago', function() {
		  testTimePassed(1, 1);
		});
	});

	it('should cancel the timer when the scope is destroyed', function () {
		var scope = $rootScope.$new();
		var element = amTimeAgoElement({}, null, scope);
		spyOn($timeout, 'cancel').and.callThrough();
		scope.$destroy();
		expect($timeout.cancel).toHaveBeenCalled();
	});

	it('should update the date after the event amMoment:languageChange', function() {
		var originalMockFromNowText = 'original-from-now-text';
		var newMockFromNowText = 'new-from-now-text';
		var mockFromNowText = originalMockFromNowText;
		MockMoment.prototype.fromNow = function() {
			return mockFromNowText;
		}
		var element = amTimeAgoElement({});
		expect(element.text()).toBe(originalMockFromNowText);
		var mockFromNowText = newMockFromNowText;
		$rootScope.$broadcast('amMoment:languageChange');
		expect(element.text()).toBe(newMockFromNowText);
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
		it('should generate a time string without suffix when configured to do so', function () {
			amTimeAgoConfig.withoutSuffix = true;
			$rootScope.testDate = new Date();
			var element = angular.element('<span am-time-ago="testDate"></span>');
			element = $compile(element)($rootScope);
			$rootScope.$digest();
			expect(element.text()).toBe('a few seconds');
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