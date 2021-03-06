/*!
 * Natural-ARCHITECTURE v0.8.0.15
 * bbalganjjm@gmail.com
 *
 * Copyright 2014 KIM HWANG MAN
 * Released under the LGPL license
 *
 * Date: 2014-09-26T11:11Z
 */
(function(window, $) {
	N.version["Natural-ARCHITECTURE"] = "0.8.0.15";

	$.fn.extend($.extend(N.prototype, {
		ajax : function(opts) {
			return N.ajax(opts);
		},
		comm : function(url) {
			return new N.comm(this, url);
		},
		request : function() {
			return this.get(0).request;
		},
		cont : function(callback) {
			return new N.cont(this, callback);
		}
	}));

	(function(N) {
		// Ajax
		var Ajax = N.ajax = $.ajax;

		// TODO
		// for json big data stream
		var SAjax = N.sajax = function(opts) {
			this.options = {
				url : null,
				method : "POST",
				contentType : "application/json; charset=utf-8",
				dataType : "json",
				async : true,
				success : null
			};

			$.extend(this.options, opts);
			var thisOpts = this.options;

			var xhr = new XMLHttpRequest();
			var beforeResponseText = "";
			var remainResponseText = "";
			xhr.onreadystatechange = function() {
				if (xhr.readyState === 3) {
					if(thisOpts.async) {
						var currResponseText = xhr.responseText.substring(beforeResponseText.length);
						currResponseText = currResponseText.substring(currResponseText.indexOf("[") + 1);

						var cutIndex = currResponseText.lastIndexOf("},") + 1;
						currResponseText = currResponseText.substring(0, cutIndex);

						var responseTextLength = currResponseText.length;
						if(currResponseText.lastIndexOf("]") === responseTextLength - 1) {
							currResponseText = currResponseText.substring(0, responseTextLength - 1);
						}

						thisOpts.success.call(this, JSON.parse("[" + remainResponseText + currResponseText + "]"));

						beforeResponseText = xhr.responseText;
						remainResponseText = beforeResponseText.substring(cutIndex + 2);
					}
				}
			};
			xhr.open(thisOpts.method, thisOpts.url, thisOpts.async);
			xhr.setRequestHeader("Content-type", thisOpts.contentType);
			xhr.send();

			return this;
		};

		// Communicator
		var Communicator = N.comm = function(obj, url) {
			if (obj === undefined) {
				N.error("[Communicator]You must input arguments[0]");
			} else {
				if ((N.isPlainObject(obj) || N.isString(obj)) && url === undefined) {
					url = obj;
					obj = [];
				} else {
					if (!N.isWrappedSet(obj) && !N.isArray(obj)) {
						obj = [ obj ];
					}
				}
			}

			obj.request = new Communicator.request(obj, N.isString(url) ? {
				"url" : url
			} : url);

			obj.submit = function(callback) {
				return Communicator.submit.call(obj, callback);
			};
			return obj;
		};

		$.extend(Communicator, {
			xhr : null,
			submit : function(callback) {
				var obj = this;
				if (N.isElement(obj)) {
					$.extend(this.request.options, {
						contentType : "text/html; charset=UTF-8",
						dataType : "html",
						type : "GET"
					});
					this.request.options.target = obj;
				}

				var afterInitFilters = [];
				var beforeSendFilters = [];
				var successFilters = [];
				var errorFilters = [];
				var completeFilters = [];
				var filters = N.context.attr("architecture").comm.filters;
				for ( var key in filters) {
					for ( var filterKey in filters[key]) {
						if (filterKey === "afterInit") {
							afterInitFilters.push(filters[key][filterKey]);
						} else if (filterKey === "beforeSend") {
							beforeSendFilters.push(filters[key][filterKey]);
						} else if (filterKey === "success") {
							successFilters.push(filters[key][filterKey]);
						} else if (filterKey === "error") {
							errorFilters.push(filters[key][filterKey]);
						} else if (filterKey === "complete") {
							completeFilters.push(filters[key][filterKey]);
						}
					}
				}

				// request filter
				$(afterInitFilters).each(function(i) {
					this(obj.request);
				});

				$.extend(obj.request.options, {
					beforeSend : function(xhr, settings) {
						// request filter
						$(beforeSendFilters).each(function(i) {
							this(obj.request, xhr, settings);
						});

					},
					success : function(data, textStatus, xhr) {
						// request filter
						$(successFilters).each(function(i) {
							this(obj.request, data, textStatus, xhr);
						});

						if (!N.isElement(obj)) {
							if (obj.request.options.urlSync && obj.request.options.referrer.replace(/!/g, "") != window.location.href.replace(/!/g, "")) {
								xhr.abort();
								return false;
							}
						} else {
							if(obj.is(N.context.attr("architecture").page.context)) {
								N.gc[N.context.attr("core").gcMode]();
							}
							if (!obj.request.options.append) {
								obj.html(data);
							} else {
								obj.append(data);
							}
							if (obj.request.options.effect) {
								obj.hide()[obj.request.options.effect[0]](obj.request.options.effect[1], obj.request.options.effect[2]);
							}
							if(obj.children("[id]:first").length > 0) {
								var sc = obj.children("[id]:first").instance("cont");
								if(sc !== undefined) {
									sc.request = obj.request;
									if(sc.init !== undefined) {
										sc.init(sc.view, obj.request);
									}
								}
							}
						}

						if (callback !== undefined) {
							try {
								callback.call(obj, data, obj.request);
							} catch (e) {
								N.error("[Communicator.submit.success.callback]" + e, e);
							}
						}
					},
					error : function(xhr, textStatus, errorThrown) {
						// request filter
						$(errorFilters).each(function(i) {
							this(obj.request, xhr, textStatus, errorThrown);
						});

						N.error("[N.ajax." + textStatus + "]" + errorThrown, errorThrown);
					},
					complete : function(xhr, textStatus) {
						// request filter
						$(completeFilters).each(function(i) {
							this(obj.request, xhr, textStatus);
						});
					}
				});
				this.xhr = N.ajax(obj.request.options);
				return obj;
			}
		});

		Communicator.request = function(obj, opts) {
			this.options = {
				referrer : window.location.href,
				contentType : "application/json; charset=utf-8",
				cache : false,
				async : true,
				type : "POST",
				data : null,
				dataType : "json",
				urlSync : true,
				crossDomain : false,
				browserHistory : true, // TODO
				append : false,
				effect : false,
				target : null
			};

			// global config
			try {
				$.extend(this.options, N.context.attr("architecture").comm.request.options);
			} catch (e) {
			}
			$.extend(this.options, opts);

			this.attrObj = {};

			this.obj = obj;
			if(!N.isString(this.options.data)) {
				// define params data
				this.options.data = JSON.stringify(this.options.data === null ?
						N.isWrappedSet(obj) ? !N.isElement(obj) ? obj.toArray()[0] : undefined : obj[0] :
								this.options.data);
			}

			if(this.options.data !== undefined) {
				if(this.options.type.toUpperCase() === "GET") {
					var firstChar = this.options.data.charAt(0);
					var lastChar = this.options.data.charAt(this.options.data.length - 1);
					if(firstChar === "{" && lastChar === "}" || firstChar === "[" && lastChar === "]") {
						this.options.data = "q=" + encodeURI(this.options.data);
					}
				}
			}
		};

		// Communicator.request local variable;
		$.fn.extend(Communicator.request.prototype, {
			/**
			 * get request attribute
			 */
			attr : function(name, obj_) {
				if (name === undefined) {
					return this.attrObj;
				}
				if (obj_ === undefined) {
					return this.attrObj !== undefined && this.attrObj[name] !== undefined ? this.attrObj[name] : undefined;
				} else {
					if (this.attrObj === undefined) {
						this.attrObj = {};
					}
					this.attrObj[name] = obj_;
					// this.obj : Defined by Communicator.request constructor;
					return this.obj;
				}
				return this;
			},
			/**
			 * remove request attribute
			 */
			removeAttr : function(name) {
				if(this.attrObj[name] != undefined) {
					delete this.attrObj[name];
				}
				return this;
			},
			/**
			 * get query parmas from request url
			 */
			param : function(name) {
				if (N.isEmptyObject(name)) {
					if (this.options.url.indexOf("?") < 0) {
						return {};
					} else {
						var params = {};
						var parts = this.options.url.split("?")[1].substring(1).split('&');
						for (var i = 0; i < parts.length; i++) {
							var nv = parts[i].split('=');
							if (!nv[0])
								continue;
							params[nv[0]] = decodeURIComponent(nv[1]) || true;
						}
						return params;
					}
				} else {
					return this.param()[name];
				}
			},
			get : function(key) {
				if(key !== undefined) {
					return this.options[key];
				} else {
					return this.options;
				}
			}
		});

		var Controller = N.cont = function(obj, callback) {
			if(N("[id='" + obj.attr("id") + "']").length > 1) {
				obj = N("#" + obj.attr("id") + ":not(.view_context__)");
			}
			if(callback === undefined) {
				return obj.data(obj.attr("id"));
			}
			if(obj.length > 1) {
				obj = N($.grep(obj, function(ele) { return !$(ele).hasClass(obj.attr("id") + "__ view_context__"); }));
			}
			obj.addClass(obj.attr("id") + "__ view_context__");

			obj.instance("cont", callback);

			callback.view = obj;
			return callback;
		};

		// Context Object
		N.context = {
			attrObj : {},
			attr : Communicator.request.prototype.attr
		};

	})(N);

})(window, jQuery);