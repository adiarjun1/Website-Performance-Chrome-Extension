(function() {
  const { s3, dynamoDB } = require('./aws-config');

  //function that will send performance data to S3
  const sendPerformanceDataToS3 = async (data) => {
      const objectKey = `performance-data/${Date.now()}.json`;
      
      const params = {
          Bucket: 'your-bucket-name',
          Key: objectKey,
          Body: JSON.stringify(data),
          ContentType: 'application/json'
      };

      try {
          await s3.putObject(params).promise();
          console.log('Successfully uploaded to S3');
      } catch (error) {
          console.error('Error uploading to S3:', error);
      }
  };

  // Function to store performance data in DynamoDB
  const storePerformanceDataInDynamoDB = async (data) => {
      const params = {
          TableName: 'PerformanceMetrics',
          Item: {
              MetricID: Date.now().toString(),
              ...data
          }
      };

      try {
          await dynamoDB.put(params).promise();
          console.log('Successfully stored in DynamoDB');
      } catch (error) {
          console.error('Error storing in DynamoDB:', error);
      }
  };

  let clsValue = 0;
  let lcpValue = 0;

  const performanceData = {
    fcp: 'N/A',
    lcp: 'N/A',
    fid: 'N/A',
    cls: 'N/A',
    maxFid: 'N/A',
    pageLoadTime: 'N/A',
    tti: 'N/A',
    ttfb: 'N/A',
    ttlb: 'N/A',
    dnsLookupTime: 'N/A',
    totalPageSize: 0,
    numHttpsRequests: 0,
    si: 'N/A'
  };

  const updateMetrics = () => {
    chrome.runtime.sendMessage({
      type: 'performanceData',
      data: performanceData
    });
  };

  const calculateSpeedIndex = () => {
    // using the performance api below, everything documented on their website
    const paintEntries = performance.getEntriesByType('paint');
    const navigationEntries = performance.getEntriesByType('navigation');

    if (paintEntries.length > 0 && navigationEntries.length > 0) {
      const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
      const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');

      if (firstPaint && firstContentfulPaint) {
        const start = navigationEntries[0].startTime;
        const fcpTime = firstContentfulPaint.startTime;
        const lcpTime = lcpValue;

        // Easy Speed Index calculation (actually a little more complicated)
        performanceData.si = ((fcpTime + lcpTime) / 2 - start).toFixed(1);
      }
    }
  };

  // Now update everything below

  if ('PerformanceObserver' in window) {
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
          performanceData.fcp = entry.startTime.toFixed(1);
          updateMetrics();
        }
      }
    }).observe({ type: 'paint', buffered: true });

    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.entryType === 'first-input') {
          const fidValue = (entry.processingStart - entry.startTime).toFixed(1);
          performanceData.fid = fidValue;
          performanceData.maxFid = Math.max(performanceData.maxFid, fidValue).toFixed(1);
          updateMetrics();
        }
      }
    }).observe({ type: 'first-input', buffered: true });

    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
          clsValue += entry.value;
          performanceData.cls = clsValue.toFixed(3);
          updateMetrics();
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });

    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.entryType === 'longtask' && entry.name === 'self') {
          performanceData.tti = entry.startTime.toFixed(1);
          updateMetrics();
        }
      }
    }).observe({ type: 'longtask', buffered: true });
  }

  const loadPerformanceData = () => {
    // really simple calculations
    const navigationTiming = performance.getEntriesByType('navigation')[0];
    const resourceTiming = performance.getEntriesByType('resource');

    if (navigationTiming) {
      performanceData.ttfb = (navigationTiming.responseStart - navigationTiming.requestStart).toFixed(1);
      performanceData.ttlb = (navigationTiming.responseEnd - navigationTiming.requestStart).toFixed(1);
      performanceData.dnsLookupTime = (navigationTiming.domainLookupEnd - navigationTiming.domainLookupStart).toFixed(1);
    }

    resourceTiming.forEach(resource => {
      performanceData.totalPageSize += resource.transferSize;
      if (resource.name.startsWith('https://')) {
        performanceData.numHttpsRequests++;
      }
    });

    updateMetrics();
  };

  const ensurePerformanceEntriesAvailable = () => {
    if (performance.getEntries().length > 0) {
      loadPerformanceData();
    } else {
      setTimeout(ensurePerformanceEntriesAvailable, 500);
    }
  };

  const calculatePageLoadTime = () => {
    // load time sometimes doesn't work using performance api so you have to do it like this
    const pageEnd = performance.now();
    const loadTime = pageEnd / 1000;

    performanceData.pageLoadTime = loadTime.toFixed(1);
    updateMetrics();

    const $perf = document.querySelector('.js-perf');
    if ($perf) {
      $perf.innerHTML += `Page loaded in ${loadTime}s.`;
    }
  };

  window.addEventListener('load', () => {
    calculatePageLoadTime();
    ensurePerformanceEntriesAvailable();
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'updateSettings') {
      loadPerformanceData();
    }
  });
})();
