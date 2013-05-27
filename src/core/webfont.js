goog.provide('webfont.WebFont');

goog.require('webfont.DomHelper');
goog.require('webfont.EventDispatcher');
goog.require('webfont.FontWatcher');

/**
 * @param {Window} mainWindow The main application window containing
 *   webfontloader.js.
 * @param {webfont.FontModuleLoader} fontModuleLoader A loader instance to use.
 * @param {webfont.UserAgent} userAgent The detected user agent to load for.
 * @constructor
 */
webfont.WebFont = function(mainWindow, fontModuleLoader, userAgent) {
  this.mainWindow_ = mainWindow;
  this.fontModuleLoader_ = fontModuleLoader;
  this.userAgent_ = userAgent;
  this.moduleLoading_ = 0;
  this.moduleFailedLoading_ = 0;
};

goog.scope(function () {
  var WebFont = webfont.WebFont,
      DomHelper = webfont.DomHelper,
      EventDispatcher = webfont.EventDispatcher,
      FontWatcher = webfont.FontWatcher;

  /**
   * @param {string} name
   * @param {webfont.FontModuleFactory} factory
   */
  WebFont.prototype.addModule = function(name, factory) {
    this.fontModuleLoader_.addModuleFactory(name, factory);
  };

  /**
   * @param {Object} configuration
   */
  WebFont.prototype.load = function(configuration) {
    var context = configuration['context'] || this.mainWindow_;
    this.domHelper_ = new DomHelper(this.mainWindow_, context);

    var eventDispatcher = new EventDispatcher(
        this.domHelper_, context.document.documentElement, configuration);

    if (this.userAgent_.getBrowserInfo().hasWebFontSupport()) {
      this.load_(eventDispatcher, configuration);
    } else {
      eventDispatcher.dispatchInactive();
    }
  };

  /**
   * @param {webfont.FontModule} module
   * @param {webfont.EventDispatcher} eventDispatcher
   * @param {webfont.FontWatcher} fontWatcher
   * @param {boolean} support
   */
  WebFont.prototype.isModuleSupportingUserAgent_ = function(module, eventDispatcher,
      fontWatcher, support) {
    var that = this;

    if (!support) {
      var allModulesLoaded = --this.moduleLoading_ == 0;

      this.moduleFailedLoading_--;
      if (allModulesLoaded) {
        if (this.moduleFailedLoading_ == 0) {
          eventDispatcher.dispatchInactive();
        } else {
          eventDispatcher.dispatchLoading();
        }
      }
      fontWatcher.watchFonts([], {}, null, allModulesLoaded);
      return;
    }

    module.load(function (fonts, opt_fontTestStrings, opt_metricCompatibleFonts) {
      that.onModuleReady_(eventDispatcher, fontWatcher, fonts, opt_fontTestStrings, opt_metricCompatibleFonts);
    });
  };

  /**
   * @param {webfont.EventDispatcher} eventDispatcher
   * @param {webfont.FontWatcher} fontWatcher
   * @param {Array.<webfont.Font>} fonts
   * @param {webfont.FontTestStrings=} opt_fontTestStrings
   * @param {Object.<string, boolean>=} opt_metricCompatibleFonts
   */
  WebFont.prototype.onModuleReady_ = function(eventDispatcher, fontWatcher, fonts, opt_fontTestStrings, opt_metricCompatibleFonts) {
    var allModulesLoaded = --this.moduleLoading_ == 0;

    if (allModulesLoaded) {
      eventDispatcher.dispatchLoading();
    }

    setTimeout(function () {
      fontWatcher.watchFonts(fonts, opt_fontTestStrings || {}, opt_metricCompatibleFonts || null, allModulesLoaded);
    }, 0);
  };

  /**
   * @param {webfont.EventDispatcher} eventDispatcher
   * @param {Object} configuration
   */
  WebFont.prototype.load_ = function(eventDispatcher, configuration) {
    var modules = this.fontModuleLoader_.getModules(configuration, this.domHelper_),
        timeout = configuration['timeout'],
        self = this;

    this.moduleFailedLoading_ = this.moduleLoading_ = modules.length;

    var fontWatcher = new webfont.FontWatcher(this.userAgent_, this.domHelper_, eventDispatcher, timeout);

    for (var i = 0, len = modules.length; i < len; i++) {
      var module = modules[i];

      module.supportUserAgent(this.userAgent_,
          goog.bind(this.isModuleSupportingUserAgent_, this, module,
          eventDispatcher, fontWatcher));
    }
  };
});
