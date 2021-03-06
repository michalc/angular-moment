/* angular-moment.js / v0.6.2 / (c) 2013, 2014 Uri Shaked / MIT Licence */

(function () {
	'use strict';

	/**
	 * Apply a timezone onto a given moment object - if moment-timezone.js is included
	 * Otherwise, it'll not apply any timezone shift.
	 * @param {Moment} aMoment
	 * @param {string} timezone
	 * @returns {Moment}
	 */
	function applyTimezone(aMoment, timezone, $log) {
		if (aMoment && timezone) {
			if (aMoment.tz) {
				aMoment = aMoment.tz(timezone);
			} else {
				$log.warn('angular-moment: timezone specified but moment.tz() is undefined. Did you forget to include moment-timezone.js?');
			}
		}
		return aMoment;
	}

	angular.module('angularMoment', [])
	/**
	 * Common configuration of the angularMoment module
	 */
		.constant('angularMomentConfig', {
			timezone: '' // e.g. 'Europe/London'
		})
		.constant('amTimeAgoConfig', { withoutSuffix: false})
	  .factory('moment', function ($window) {
	    return $window.moment;
	  })
		.directive('amTimeAgo', ['$timeout', 'moment', 'amTimeAgoConfig', function ($timeout, moment, amTimeAgoConfig) {

			return {
				link: function (scope, element, attr) {
					var activeTimeout = null;
					var currentValue;
					var currentFormat;
					var withoutSuffix = amTimeAgoConfig.withoutSuffix;
					var updateTimes = {
						180: 300,
						60: 30,
						1: 1
					};

					function cancelTimer() {
						$timeout.cancel(activeTimeout);
					}

					function waitUntilUpdateRequired(momentInstance) {
						var howOld = moment().diff(momentInstance, 'minute');
						var secondsUntilUpdate = 3600;
						angular.forEach(updateTimes, function(wait, maxCurrent) {
							if (howOld <= maxCurrent) {
								secondsUntilUpdate = wait;
							}
						});
						activeTimeout = $timeout(angular.noop, secondsUntilUpdate * 1000);
						return activeTimeout;
					}

					function updateTime(momentInstance) {
						element.text(momentInstance.fromNow(withoutSuffix));
						return waitUntilUpdateRequired().then(function() {
							return updateTime(momentInstance);
						});
					}

					function updateMoment() {
						cancelTimer();
						updateTime(moment(currentValue, currentFormat));
					}

					scope.$watch(attr.amTimeAgo, function (value) {
						if ((typeof value === 'undefined') || (value === null) || (value === '')) {
							cancelTimer();
							if (currentValue) {
								element.text('');
								currentValue = null;
							}
							return;
						}
						// else assume the given value is already a date

						currentValue = value;
						updateMoment();
					});

					if (angular.isDefined(attr.amWithoutSuffix)) {
						scope.$watch(attr.amWithoutSuffix, function (value) {
							if (typeof value === 'boolean') {
								withoutSuffix = value;
								updateMoment();
							} else {
								withoutSuffix = amTimeAgoConfig.withoutSuffix;
							}
						});
					}

					attr.$observe('amFormat', function (format) {
						currentFormat = format;
						if (currentValue) {
							updateMoment();
						}
					});

					scope.$on('$destroy', function () {
						cancelTimer();
					});

					scope.$on('amMoment:languageChange', function () {
						updateMoment();
					});
				}
			};
		}])
		.factory('amMoment', ['moment', '$rootScope', function (moment, $rootScope) {
			return {
				changeLanguage: function (lang) {
					var result = moment.lang(lang);
					if (angular.isDefined(lang)) {
						$rootScope.$broadcast('amMoment:languageChange');
					}
					return result;
				}
			};
		}])
		.filter('amCalendar', ['moment', '$log', 'angularMomentConfig', function (moment, $log, angularMomentConfig) {

			return function (value) {
				if (typeof value === 'undefined' || value === null) {
					return '';
				}

				if (!isNaN(parseFloat(value)) && isFinite(value)) {
					// Milliseconds since the epoch
					value = moment(parseInt(value, 10));
				}

				var momentInstance = moment(value);
				if (!momentInstance.isValid()) {
					return '';
				}

				return applyTimezone(momentInstance, angularMomentConfig.timezone, $log).calendar();
			};
		}])
		.filter('amDateFormat', ['moment', '$log', 'angularMomentConfig', function (moment, $log, angularMomentConfig) {

			return function (value, format) {
				if (typeof value === 'undefined' || value === null) {
					return '';
				}

				if (!isNaN(parseFloat(value)) && isFinite(value)) {
					// Milliseconds since the epoch
					value = moment(parseInt(value, 10));
				}

				var momentInstance = moment(value);
				if (!momentInstance.isValid()) {
					return '';
				}

				return applyTimezone(momentInstance, angularMomentConfig.timezone, $log).format(format);
			};
		}])
		.filter('amDurationFormat', ['moment', function (moment) {

			return function (value, format, suffix) {
				if (typeof value === 'undefined' || value === null) {
					return '';
				}

				// else assume the given value is already a duration in a format (miliseconds, etc)
				return moment.duration(value, format).humanize(suffix);
			};
		}]);

})();
