/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

XPCOMUtils.defineLazyServiceGetter(this, "cpmm",
                                   "@mozilla.org/childprocessmessagemanager;1",
                                   "nsISyncMessageSender");

function debug(aMsg) {
  //dump("-- ActivityRequestHandler.js " + Date.now() + " : " + aMsg + "\n");
}

/**
  * nsIDOMMozActivityRequestHandler implementation.
  */

function ActivityRequestHandler() {
  debug("ActivityRequestHandler");
  this.wrappedJSObject = this;

  // When a system message of type 'activity' is emitted, it forces the
  // creation of an ActivityWrapper which in turns replace the default
  // system message callback. The newly created wrapper then create a
  // nsIDOMActivityRequestHandler object and fills up the properties of
  // this object as well as the properties of the ActivityOptions
  // dictionary contained by the request handler.
  this._id = null;
  this._options = {name: "", data: null};
}

ActivityRequestHandler.prototype = {
  __exposedProps__: {
                      source: "r",
                      postResult: "r",
                      postError: "r"
                    },

  get source() {
    return this._options;
  },

  postResult: function arh_postResult(aResult) {
    cpmm.sendAsyncMessage("Activity:PostResult", {
      "id": this._id,
      "result": aResult
    });
    Services.obs.notifyObservers(null, "activity-success", this._id);
  },

  postError: function arh_postError(aError) {
    cpmm.sendAsyncMessage("Activity:PostError", {
      "id": this._id,
      "error": aError
    });
    Services.obs.notifyObservers(null, "activity-error", this._id);
  },

  classID: Components.ID("{9326952a-dbe3-4d81-a51f-d9c160d96d6b}"),

  QueryInterface: XPCOMUtils.generateQI([
    Ci.nsIDOMMozActivityRequestHandler
  ]),

  classInfo: XPCOMUtils.generateCI({
    classID: Components.ID("{9326952a-dbe3-4d81-a51f-d9c160d96d6b}"),
    contractID: "@mozilla.org/dom/activities/request-handler;1",
    interfaces: [Ci.nsIDOMMozActivityRequestHandler],
    flags: Ci.nsIClassInfo.DOM_OBJECT,
    classDescription: "Activity Request Handler"
  })
}

this.NSGetFactory = XPCOMUtils.generateNSGetFactory([ActivityRequestHandler]);
