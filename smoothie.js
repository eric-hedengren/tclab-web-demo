(function(exports) {
      Date.now = Date.now || function() { return new Date().getTime(); };
      var Util = {
        extend: function() {
          arguments[0] = arguments[0] || {};
          for (var i = 1; i < arguments.length; i++)
          {
            for (var key in arguments[i])
            {
              if (arguments[i].hasOwnProperty(key))
              {
                if (typeof(arguments[i][key]) === 'object') {
                  if (arguments[i][key] instanceof Array) {
                    arguments[0][key] = arguments[i][key];
                  } else {
                    arguments[0][key] = Util.extend(arguments[0][key], arguments[i][key]);
                  }
                } else {
                  arguments[0][key] = arguments[i][key];
                }
              }
            }
          }
          return arguments[0];
        },
        binarySearch: function(data, value) {
          var low = 0,
              high = data.length;
          while (low < high) {
            var mid = (low + high) >> 1;
            if (value < data[mid][0])
              high = mid;
            else
              low = mid + 1;
          }
          return low;
        },
        pixelSnap: function(position, lineWidth) {
          if (lineWidth % 2 === 0) {
            return Math.round(position);
          } else {
            return Math.floor(position) + 0.5;
          }
        },
      };
      function TimeSeries(options) {
        this.options = Util.extend({}, TimeSeries.defaultOptions, options);
        this.disabled = false;
        this.clear();
      }
      TimeSeries.defaultOptions = {
        resetBoundsInterval: 3000,
        resetBounds: true
      };
      TimeSeries.prototype.clear = function() {
        this.data = [];
        this.maxValue = Number.NaN;
        this.minValue = Number.NaN;
      };
      TimeSeries.prototype.resetBounds = function() {
        if (this.data.length) {
          this.maxValue = this.data[0][1];
          this.minValue = this.data[0][1];
          for (var i = 1; i < this.data.length; i++) {
            var value = this.data[i][1];
            if (value > this.maxValue) {
              this.maxValue = value;
            }
            if (value < this.minValue) {
              this.minValue = value;
            }
          }
        } else {
          this.maxValue = Number.NaN;
          this.minValue = Number.NaN;
        }
      };
      TimeSeries.prototype.append = function(timestamp, value, sumRepeatedTimeStampValues) {
        if (isNaN(timestamp) || isNaN(value)){
            return
        }
        var lastI = this.data.length - 1;
        if (lastI >= 0) {
          var i = lastI;
          while (true) {
            var iThData = this.data[i];
            if (timestamp >= iThData[0]) {
              if (timestamp === iThData[0]) {
                if (sumRepeatedTimeStampValues) {
                  iThData[1] += value;
                  value = iThData[1];
                } else {
                  iThData[1] = value;
                }
              } else {
                this.data.splice(i + 1, 0, [timestamp, value]);
              }
              break;
            }
            i--;
            if (i < 0) {
              this.data.splice(0, 0, [timestamp, value]);
              break;
            }
          }
        } else {
          this.data.push([timestamp, value]);
        }
        this.maxValue = isNaN(this.maxValue) ? value : Math.max(this.maxValue, value);
        this.minValue = isNaN(this.minValue) ? value : Math.min(this.minValue, value);
      };
      TimeSeries.prototype.dropOldData = function(oldestValidTime, maxDataSetLength) {
        var removeCount = 0;
        while (this.data.length - removeCount >= maxDataSetLength && this.data[removeCount + 1][0] < oldestValidTime) {
          removeCount++;
        }
        if (removeCount !== 0) {
          this.data.splice(0, removeCount);
        }
      };
      function SmoothieChart(options) {
        this.options = Util.extend({}, SmoothieChart.defaultChartOptions, options);
        this.seriesSet = [];
        this.currentValueRange = 1;
        this.currentVisMinValue = 0;
        this.lastRenderTimeMillis = 0;
        this.lastChartTimestamp = 0;
        this.mousemove = this.mousemove.bind(this);
        this.mouseout = this.mouseout.bind(this);
      }
      SmoothieChart.tooltipFormatter = function (timestamp, data) {
          var timestampFormatter = this.options.timestampFormatter || SmoothieChart.timeFormatter,
              elements = document.createElement('div'),
              label;
          elements.appendChild(document.createTextNode(
            timestampFormatter(new Date(timestamp))
          ));
          for (var i = 0; i < data.length; ++i) {
            label = data[i].series.options.tooltipLabel || ''
            if (label !== ''){
                label = label + ' ';
            }
            var dataEl = document.createElement('span');
            dataEl.style.color = data[i].series.options.strokeStyle;
            dataEl.appendChild(document.createTextNode(
              label + this.options.yMaxFormatter(data[i].value, this.options.labels.precision)
            ));
            elements.appendChild(document.createElement('br'));
            elements.appendChild(dataEl);
          }
          return elements.innerHTML;
      };
      SmoothieChart.defaultChartOptions = {
        millisPerPixel: 20,
        enableDpiScaling: true,
        yMinFormatter: function(min, precision) {
          return parseFloat(min).toFixed(precision);
        },
        yMaxFormatter: function(max, precision) {
          return parseFloat(max).toFixed(precision);
        },
        yIntermediateFormatter: function(intermediate, precision) {
          return parseFloat(intermediate).toFixed(precision);
        },
        maxValueScale: 1,
        minValueScale: 1,
        interpolation: 'bezier',
        scaleSmoothing: 0.125,
        maxDataSetLength: 2,
        scrollBackwards: false,
        displayDataFromPercentile: 1,
        grid: {
          fillStyle: '#000000',
          strokeStyle: '#777777',
          lineWidth: 2,
          millisPerLine: 1000,
          verticalSections: 2,
          borderVisible: true
        },
        labels: {
          fillStyle: '#ffffff',
          disabled: false,
          fontSize: 10,
          fontFamily: 'monospace',
          precision: 2,
          showIntermediateLabels: false,
          intermediateLabelSameAxis: true,
        },
        title: {
          text: '',
          fillStyle: '#ffffff',
          fontSize: 15,
          fontFamily: 'monospace',
          verticalAlign: 'middle'
        },
        horizontalLines: [],
        tooltip: false,
        tooltipLine: {
          lineWidth: 1,
          strokeStyle: '#BBBBBB'
        },
        tooltipFormatter: SmoothieChart.tooltipFormatter,
        nonRealtimeData: false,
        responsive: false,
        limitFPS: 0
      };
      SmoothieChart.AnimateCompatibility = (function() {
        var requestAnimationFrame = function(callback, element) {
              var requestAnimationFrame =
                window.requestAnimationFrame        ||
                window.webkitRequestAnimationFrame  ||
                window.mozRequestAnimationFrame     ||
                window.oRequestAnimationFrame       ||
                window.msRequestAnimationFrame      ||
                function(callback) {
                  return window.setTimeout(function() {
                    callback(Date.now());
                  }, 16);
                };
              return requestAnimationFrame.call(window, callback, element);
            },
            cancelAnimationFrame = function(id) {
              var cancelAnimationFrame =
                window.cancelAnimationFrame ||
                function(id) {
                  clearTimeout(id);
                };
              return cancelAnimationFrame.call(window, id);
            };
        return {
          requestAnimationFrame: requestAnimationFrame,
          cancelAnimationFrame: cancelAnimationFrame
        };
      })();
      SmoothieChart.defaultSeriesPresentationOptions = {
        lineWidth: 1,
        strokeStyle: '#ffffff',
        fillToBottom: true,
      };
      SmoothieChart.prototype.addTimeSeries = function(timeSeries, options) {
        this.seriesSet.push({timeSeries: timeSeries, options: Util.extend({}, SmoothieChart.defaultSeriesPresentationOptions, options)});
        if (timeSeries.options.resetBounds && timeSeries.options.resetBoundsInterval > 0) {
          timeSeries.resetBoundsTimerId = setInterval(
            function() {
              timeSeries.resetBounds();
            },
            timeSeries.options.resetBoundsInterval
          );
        }
      };
      SmoothieChart.prototype.removeTimeSeries = function(timeSeries) {
        var numSeries = this.seriesSet.length;
        for (var i = 0; i < numSeries; i++) {
          if (this.seriesSet[i].timeSeries === timeSeries) {
            this.seriesSet.splice(i, 1);
            break;
          }
        }
        if (timeSeries.resetBoundsTimerId) {
          clearInterval(timeSeries.resetBoundsTimerId);
        }
      };
      SmoothieChart.prototype.getTimeSeriesOptions = function(timeSeries) {
        var numSeries = this.seriesSet.length;
        for (var i = 0; i < numSeries; i++) {
          if (this.seriesSet[i].timeSeries === timeSeries) {
            return this.seriesSet[i].options;
          }
        }
      };
      SmoothieChart.prototype.bringToFront = function(timeSeries) {
        var numSeries = this.seriesSet.length;
        for (var i = 0; i < numSeries; i++) {
          if (this.seriesSet[i].timeSeries === timeSeries) {
            var set = this.seriesSet.splice(i, 1);
            this.seriesSet.push(set[0]);
            break;
          }
        }
      };
      SmoothieChart.prototype.streamTo = function(canvas, delayMillis) {
        this.canvas = canvas;
        this.clientWidth = parseInt(this.canvas.getAttribute('width'));
        this.clientHeight = parseInt(this.canvas.getAttribute('height'));
        this.delay = delayMillis;
        this.start();
      };
      SmoothieChart.prototype.getTooltipEl = function () {
        if (!this.tooltipEl) {
          this.tooltipEl = document.createElement('div');
          this.tooltipEl.className = 'smoothie-chart-tooltip';
          this.tooltipEl.style.pointerEvents = 'none';
          this.tooltipEl.style.position = 'absolute';
          this.tooltipEl.style.display = 'none';
          document.body.appendChild(this.tooltipEl);
        }
        return this.tooltipEl;
      };
      SmoothieChart.prototype.updateTooltip = function () {
        if(!this.options.tooltip){
         return; 
        }
        var el = this.getTooltipEl();
        if (!this.mouseover || !this.options.tooltip) {
          el.style.display = 'none';
          return;
        }
        var time = this.lastChartTimestamp;
        var t = this.options.scrollBackwards
          ? time - this.mouseX * this.options.millisPerPixel
          : time - (this.clientWidth - this.mouseX) * this.options.millisPerPixel;
        var data = [];
        for (var d = 0; d < this.seriesSet.length; d++) {
          var timeSeries = this.seriesSet[d].timeSeries;
          if (timeSeries.disabled) {
              continue;
          }
          var closeIdx = Util.binarySearch(timeSeries.data, t);
          if (closeIdx > 0 && closeIdx < timeSeries.data.length) {
            data.push({ series: this.seriesSet[d], index: closeIdx, value: timeSeries.data[closeIdx][1] });
          }
        }
        if (data.length) {
          el.innerHTML = this.options.tooltipFormatter.call(this, t, data);
          el.style.display = 'block';
        } else {
          el.style.display = 'none';
        }
      };
      SmoothieChart.prototype.mousemove = function (evt) {
        this.mouseover = true;
        this.mouseX = evt.offsetX;
        this.mouseY = evt.offsetY;
        this.mousePageX = evt.pageX;
        this.mousePageY = evt.pageY;
        if(!this.options.tooltip){
         return; 
        }
        var el = this.getTooltipEl();
        el.style.top = Math.round(this.mousePageY) + 'px';
        el.style.left = Math.round(this.mousePageX) + 'px';
        this.updateTooltip();
      };
      SmoothieChart.prototype.mouseout = function () {
        this.mouseover = false;
        this.mouseX = this.mouseY = -1;
        if (this.tooltipEl)
          this.tooltipEl.style.display = 'none';
      };
      SmoothieChart.prototype.resize = function () {
        var dpr = !this.options.enableDpiScaling || !window ? 1 : window.devicePixelRatio,
            width, height;
        if (this.options.responsive) {
          width = this.canvas.offsetWidth;
          height = this.canvas.offsetHeight;
          if (width !== this.lastWidth) {
            this.lastWidth = width;
            this.canvas.setAttribute('width', (Math.floor(width * dpr)).toString());
            this.canvas.getContext('2d').scale(dpr, dpr);
          }
          if (height !== this.lastHeight) {
            this.lastHeight = height;
            this.canvas.setAttribute('height', (Math.floor(height * dpr)).toString());
            this.canvas.getContext('2d').scale(dpr, dpr);
          }
          this.clientWidth = width;
          this.clientHeight = height;
        } else {
          width = parseInt(this.canvas.getAttribute('width'));
          height = parseInt(this.canvas.getAttribute('height'));
          if (dpr !== 1) {
            if (Math.floor(this.clientWidth * dpr) !== width) {
              this.canvas.setAttribute('width', (Math.floor(width * dpr)).toString());
              this.canvas.style.width = width + 'px';
              this.clientWidth = width;
              this.canvas.getContext('2d').scale(dpr, dpr);
            }
            if (Math.floor(this.clientHeight * dpr) !== height) {
              this.canvas.setAttribute('height', (Math.floor(height * dpr)).toString());
              this.canvas.style.height = height + 'px';
              this.clientHeight = height;
              this.canvas.getContext('2d').scale(dpr, dpr);
            }
          } else {
            this.clientWidth = width;
            this.clientHeight = height;
          }
        }
      };
      SmoothieChart.prototype.start = function() {
        if (this.frame) {
          return;
        }
        this.canvas.addEventListener('mousemove', this.mousemove);
        this.canvas.addEventListener('mouseout', this.mouseout);
        var animate = function() {
          this.frame = SmoothieChart.AnimateCompatibility.requestAnimationFrame(function() {
            if(this.options.nonRealtimeData){
               var dateZero = new Date(0);
               var maxTimeStamp = this.seriesSet.reduce(function(max, series){
                 var dataSet = series.timeSeries.data;
                 var indexToCheck = Math.round(this.options.displayDataFromPercentile * dataSet.length) - 1;
                 indexToCheck = indexToCheck >= 0 ? indexToCheck : 0;
                 indexToCheck = indexToCheck <= dataSet.length -1 ? indexToCheck : dataSet.length -1;
                 if(dataSet && dataSet.length > 0)
                 {
                  var lastDataTimeStamp = dataSet[indexToCheck][0];
                  max = max > lastDataTimeStamp ? max : lastDataTimeStamp;
                 }
                 return max;
              }.bind(this), dateZero);
              this.render(this.canvas, maxTimeStamp > dateZero ? maxTimeStamp : null);
            } else {
              this.render();
            }
            animate();
          }.bind(this));
        }.bind(this);
        animate();
      };
      SmoothieChart.prototype.stop = function() {
        if (this.frame) {
          SmoothieChart.AnimateCompatibility.cancelAnimationFrame(this.frame);
          delete this.frame;
          this.canvas.removeEventListener('mousemove', this.mousemove);
          this.canvas.removeEventListener('mouseout', this.mouseout);
        }
      };
      SmoothieChart.prototype.updateValueRange = function() {
        var chartOptions = this.options,
            chartMaxValue = Number.NaN,
            chartMinValue = Number.NaN;
        for (var d = 0; d < this.seriesSet.length; d++) {
          var timeSeries = this.seriesSet[d].timeSeries;
          if (timeSeries.disabled) {
              continue;
          }
          if (!isNaN(timeSeries.maxValue)) {
            chartMaxValue = !isNaN(chartMaxValue) ? Math.max(chartMaxValue, timeSeries.maxValue) : timeSeries.maxValue;
          }
          if (!isNaN(timeSeries.minValue)) {
            chartMinValue = !isNaN(chartMinValue) ? Math.min(chartMinValue, timeSeries.minValue) : timeSeries.minValue;
          }
        }
        if (chartOptions.maxValue != null) {
          chartMaxValue = chartOptions.maxValue;
        } else {
          chartMaxValue *= chartOptions.maxValueScale;
        }
        if (chartOptions.minValue != null) {
          chartMinValue = chartOptions.minValue;
        } else {
          chartMinValue -= Math.abs(chartMinValue * chartOptions.minValueScale - chartMinValue);
        }
        if (this.options.yRangeFunction) {
          var range = this.options.yRangeFunction({min: chartMinValue, max: chartMaxValue});
          chartMinValue = range.min;
          chartMaxValue = range.max;
        }
        if (!isNaN(chartMaxValue) && !isNaN(chartMinValue)) {
          var targetValueRange = chartMaxValue - chartMinValue;
          var valueRangeDiff = (targetValueRange - this.currentValueRange);
          var minValueDiff = (chartMinValue - this.currentVisMinValue);
          this.isAnimatingScale = Math.abs(valueRangeDiff) > 0.1 || Math.abs(minValueDiff) > 0.1;
          this.currentValueRange += chartOptions.scaleSmoothing * valueRangeDiff;
          this.currentVisMinValue += chartOptions.scaleSmoothing * minValueDiff;
        }
        this.valueRange = { min: chartMinValue, max: chartMaxValue };
      };
      SmoothieChart.prototype.render = function(canvas, time) {
        var chartOptions = this.options,
            nowMillis = Date.now();
        if (chartOptions.limitFPS > 0 && nowMillis - this.lastRenderTimeMillis < (1000/chartOptions.limitFPS))
          return;
        time = (time || nowMillis) - (this.delay || 0);
        time -= time % chartOptions.millisPerPixel;
        if (!this.isAnimatingScale) {
          var sameTime = this.lastChartTimestamp === time;
          if (sameTime) {
            var needToRenderInCaseCanvasResized = nowMillis - this.lastRenderTimeMillis > 1000/6;
            if (!needToRenderInCaseCanvasResized) {
              return;
            }
          }
        }
        this.lastRenderTimeMillis = nowMillis;
        this.lastChartTimestamp = time;
        this.resize();
        canvas = canvas || this.canvas;
        var context = canvas.getContext('2d'),
            dimensions = { top: 0, left: 0, width: this.clientWidth, height: this.clientHeight },
            oldestValidTime = time - (dimensions.width * chartOptions.millisPerPixel),
            valueToYPosition = function(value, lineWidth) {
              var offset = value - this.currentVisMinValue,
                  unsnapped = this.currentValueRange === 0
                    ? dimensions.height
                    : dimensions.height * (1 - offset / this.currentValueRange);
              return Util.pixelSnap(unsnapped, lineWidth);
            }.bind(this),
            timeToXPosition = function(t, lineWidth) {
              var offset = time / chartOptions.millisPerPixel - t / chartOptions.millisPerPixel;
              var unsnapped = chartOptions.scrollBackwards
                ? offset
                : dimensions.width - offset;
              return Util.pixelSnap(unsnapped, lineWidth);
            };
        this.updateValueRange();
        context.font = chartOptions.labels.fontSize + 'px ' + chartOptions.labels.fontFamily;
        context.save();
        context.translate(dimensions.left, dimensions.top);
        context.beginPath();
        context.rect(0, 0, dimensions.width, dimensions.height);
        context.clip();
        context.save();
        context.fillStyle = chartOptions.grid.fillStyle;
        context.clearRect(0, 0, dimensions.width, dimensions.height);
        context.fillRect(0, 0, dimensions.width, dimensions.height);
        context.restore();
        context.save();
        context.lineWidth = chartOptions.grid.lineWidth;
        context.strokeStyle = chartOptions.grid.strokeStyle;
        if (chartOptions.grid.millisPerLine > 0) {
          context.beginPath();
          for (var t = time - (time % chartOptions.grid.millisPerLine);
               t >= oldestValidTime;
               t -= chartOptions.grid.millisPerLine) {
            var gx = timeToXPosition(t, chartOptions.grid.lineWidth);
            context.moveTo(gx, 0);
            context.lineTo(gx, dimensions.height);
          }
          context.stroke();
        }
        for (var v = 1; v < chartOptions.grid.verticalSections; v++) {
          var gy = Util.pixelSnap(v * dimensions.height / chartOptions.grid.verticalSections, chartOptions.grid.lineWidth);
          context.beginPath();
          context.moveTo(0, gy);
          context.lineTo(dimensions.width, gy);
          context.stroke();
        }
        if (chartOptions.grid.borderVisible) {
          context.strokeRect(0, 0, dimensions.width, dimensions.height);
        }
        context.restore();
        if (chartOptions.horizontalLines && chartOptions.horizontalLines.length) {
          for (var hl = 0; hl < chartOptions.horizontalLines.length; hl++) {
            var line = chartOptions.horizontalLines[hl],
                lineWidth = line.lineWidth || 1,
                hly = valueToYPosition(line.value, lineWidth);
            context.strokeStyle = line.color || '#ffffff';
            context.lineWidth = lineWidth;
            context.beginPath();
            context.moveTo(0, hly);
            context.lineTo(dimensions.width, hly);
            context.stroke();
          }
        }
        for (var d = 0; d < this.seriesSet.length; d++) {
          var timeSeries = this.seriesSet[d].timeSeries,
              dataSet = timeSeries.data;
          timeSeries.dropOldData(oldestValidTime, chartOptions.maxDataSetLength);
          if (dataSet.length <= 1 || timeSeries.disabled) {
              continue;
          }
          context.save();
          var seriesOptions = this.seriesSet[d].options,
              drawStroke = seriesOptions.strokeStyle && seriesOptions.strokeStyle !== 'none',
              lineWidthMaybeZero = drawStroke ? seriesOptions.lineWidth : 0;
          context.beginPath();
          var firstX = timeToXPosition(dataSet[0][0], lineWidthMaybeZero),
            firstY = valueToYPosition(dataSet[0][1], lineWidthMaybeZero),
            lastX = firstX,
            lastY = firstY,
            draw;
          context.moveTo(firstX, firstY);
          switch (seriesOptions.interpolation || chartOptions.interpolation) {
            case "linear":
            case "line": {
              draw = function(x, y, lastX, lastY) {
                context.lineTo(x,y);
              }
              break;
            }
            case "bezier":
            default: {
              draw = function(x, y, lastX, lastY) {
                context.bezierCurveTo(
                  Math.round((lastX + x) / 2), lastY,
                  Math.round((lastX + x)) / 2, y,
                  x, y);
              }
              break;
            }
            case "step": {
              draw = function(x, y, lastX, lastY) {
                context.lineTo(x,lastY);
                context.lineTo(x,y);
              }
              break;
            }
          }
          for (var i = 1; i < dataSet.length; i++) {
            var iThData = dataSet[i],
                x = timeToXPosition(iThData[0], lineWidthMaybeZero),
                y = valueToYPosition(iThData[1], lineWidthMaybeZero);
            draw(x, y, lastX, lastY);
            lastX = x; lastY = y;
          }
          if (drawStroke) {
            context.lineWidth = seriesOptions.lineWidth;
            context.strokeStyle = seriesOptions.strokeStyle;
            context.stroke();
          }
          if (seriesOptions.fillStyle) {
            var fillEndY = seriesOptions.fillToBottom
              ? dimensions.height + lineWidthMaybeZero + 1
              : valueToYPosition(0, 0);
            context.lineTo(lastX, fillEndY);
            context.lineTo(firstX, fillEndY);
            context.fillStyle = seriesOptions.fillStyle;
            context.fill();
          }
          context.restore();
        }
        if (chartOptions.tooltip && this.mouseX >= 0) {
          context.lineWidth = chartOptions.tooltipLine.lineWidth;
          context.strokeStyle = chartOptions.tooltipLine.strokeStyle;
          context.beginPath();
          context.moveTo(this.mouseX, 0);
          context.lineTo(this.mouseX, dimensions.height);
          context.stroke();
        }
        this.updateTooltip();
        var labelsOptions = chartOptions.labels;
        if (!labelsOptions.disabled && !isNaN(this.valueRange.min) && !isNaN(this.valueRange.max)) {
          var maxValueString = chartOptions.yMaxFormatter(this.valueRange.max, labelsOptions.precision),
              minValueString = chartOptions.yMinFormatter(this.valueRange.min, labelsOptions.precision),
              maxLabelPos = chartOptions.scrollBackwards ? 0 : dimensions.width - context.measureText(maxValueString).width - 2,
              minLabelPos = chartOptions.scrollBackwards ? 0 : dimensions.width - context.measureText(minValueString).width - 2;
          context.fillStyle = labelsOptions.fillStyle;
          context.fillText(maxValueString, maxLabelPos, labelsOptions.fontSize);
          context.fillText(minValueString, minLabelPos, dimensions.height - 2);
        }
        if ( labelsOptions.showIntermediateLabels
              && !isNaN(this.valueRange.min) && !isNaN(this.valueRange.max)
              && chartOptions.grid.verticalSections > 0) {
          var step = (this.valueRange.max - this.valueRange.min) / chartOptions.grid.verticalSections;
          var stepPixels = dimensions.height / chartOptions.grid.verticalSections;
          for (var v = 1; v < chartOptions.grid.verticalSections; v++) {
            var gy = dimensions.height - Math.round(v * stepPixels),
                yValue = chartOptions.yIntermediateFormatter(this.valueRange.min + (v * step), labelsOptions.precision),
                intermediateLabelPos =
                  labelsOptions.intermediateLabelSameAxis
                  ? (chartOptions.scrollBackwards ? 0 : dimensions.width - context.measureText(yValue).width - 2)
                  : (chartOptions.scrollBackwards ? dimensions.width - context.measureText(yValue).width - 2 : 0);
            context.fillText(yValue, intermediateLabelPos, gy - chartOptions.grid.lineWidth);
          }
        }
        if (chartOptions.timestampFormatter && chartOptions.grid.millisPerLine > 0) {
          var textUntilX = chartOptions.scrollBackwards
            ? context.measureText(minValueString).width
            : dimensions.width - context.measureText(minValueString).width + 4;
          for (var t = time - (time % chartOptions.grid.millisPerLine);
               t >= oldestValidTime;
               t -= chartOptions.grid.millisPerLine) {
            var gx = timeToXPosition(t, 0);
            if ((!chartOptions.scrollBackwards && gx < textUntilX) || (chartOptions.scrollBackwards && gx > textUntilX))  {
              var tx = new Date(t),
                ts = chartOptions.timestampFormatter(tx),
                tsWidth = context.measureText(ts).width;
              textUntilX = chartOptions.scrollBackwards
                ? gx + tsWidth + 2
                : gx - tsWidth - 2;
              context.fillStyle = chartOptions.labels.fillStyle;
              if(chartOptions.scrollBackwards) {
                context.fillText(ts, gx, dimensions.height - 2);
              } else {
                context.fillText(ts, gx - tsWidth, dimensions.height - 2);
              }
            }
          }
        }
        if (chartOptions.title.text !== '') {
          context.font = chartOptions.title.fontSize + 'px ' + chartOptions.title.fontFamily;
          var titleXPos = chartOptions.scrollBackwards ? dimensions.width - context.measureText(chartOptions.title.text).width - 2 : 2;
          if (chartOptions.title.verticalAlign == 'bottom') {
            context.textBaseline = 'bottom';
            var titleYPos = dimensions.height;
          } else if (chartOptions.title.verticalAlign == 'middle') {
            context.textBaseline = 'middle';
            var titleYPos = dimensions.height / 2;
          } else {
            context.textBaseline = 'top';
            var titleYPos = 0;
          }
          context.fillStyle = chartOptions.title.fillStyle;
          context.fillText(chartOptions.title.text, titleXPos, titleYPos);
        }
        context.restore();
      };
      SmoothieChart.timeFormatter = function(date) {
        function pad2(number) { return (number < 10 ? '0' : '') + number }
        return pad2(date.getHours()) + ':' + pad2(date.getMinutes()) + ':' + pad2(date.getSeconds());
      };
      exports.TimeSeries = TimeSeries;
      exports.SmoothieChart = SmoothieChart;
    })(typeof exports === 'undefined' ? this : exports);