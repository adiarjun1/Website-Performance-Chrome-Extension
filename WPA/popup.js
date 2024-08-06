const app = angular.module('metricsApp', []);

app.controller('MetricsController', ['$scope', '$timeout', ($scope, $timeout) => {
    const thresholds = {
        // [Good, Moderate, Poor]
        ttfb: [200, 300, 500], 
        ttlb: [1000, 2000, 3000],
        dnsLookupTime: [100, 200, 300],
        fcp: [1000, 2000, 3000],
        totalPageSize: [2000000, 3000000, 5000000], 
        numHttpsRequests: [50, 100, 150],
        si: [3500, 4500, 6000],
        lcp: [2500, 4000, 6000],
        fid: [100, 300, 500],
        cls: [0.1, 0.25, 0.5],
        maxFid: [150, 300, 500],
        pageLoadTime: [2500, 4000, 6000],
        tti: [3000, 5000, 8000]
    };

    const getMetricClass = (key, value) => {
        const threshold = thresholds[key];
        if (value <= threshold[0]) return 'good';
        if (value <= threshold[1]) return 'moderate';
        if (value <= threshold[2]) return 'poor';
        return 'bad';
    };

    $scope.metrics = [];
    $scope.settings = {};
    $scope.hasData = false;
    $scope.error = '';
    $scope.historicalDataAvailable = false;

    const loadMetrics = () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tabId = tabs[0].id;
            chrome.storage.local.get([tabId.toString(), 'historicalData'], (data) => {
                const metrics = data[tabId];
                const historicalData = data.historicalData || [];
                if (metrics) {
                    $scope.$applyAsync(() => {
                        $scope.metrics = [
                            { key: 'ttfb', name: 'TTFB', value: metrics.ttfb + ' ms', class: getMetricClass('ttfb', metrics.ttfb) },
                            { key: 'ttlb', name: 'TTLB', value: metrics.ttlb + ' ms', class: getMetricClass('ttlb', metrics.ttlb) },
                            { key: 'dnsLookupTime', name: 'DNS Lookup Time', value: metrics.dnsLookupTime + ' ms', class: getMetricClass('dnsLookupTime', metrics.dnsLookupTime) },
                            { key: 'fcp', name: 'FCP', value: metrics.fcp + ' ms', class: getMetricClass('fcp', metrics.fcp) },
                            { key: 'totalPageSize', name: 'Total Page Size', value: metrics.totalPageSize + ' bytes', class: getMetricClass('totalPageSize', metrics.totalPageSize) },
                            { key: 'numHttpsRequests', name: 'Num of HTTPS Requests', value: metrics.numHttpsRequests, class: getMetricClass('numHttpsRequests', metrics.numHttpsRequests) },
                            { key: 'si', name: 'Speed Index', value: metrics.si + ' ms', class: getMetricClass('si', metrics.si) },
                            { key: 'lcp', name: 'LCP', value: metrics.lcp + ' ms', class: getMetricClass('lcp', metrics.lcp) },
                            { key: 'fid', name: 'FID', value: metrics.fid + ' ms', class: getMetricClass('fid', metrics.fid) },
                            { key: 'cls', name: 'CLS', value: metrics.cls, class: getMetricClass('cls', metrics.cls) },
                            { key: 'maxFid', name: 'Max FID', value: metrics.maxFid + ' ms', class: getMetricClass('maxFid', metrics.maxFid) },
                            { key: 'pageLoadTime', name: 'Page Load Time', value: metrics.pageLoadTime + ' ms', class: getMetricClass('pageLoadTime', metrics.pageLoadTime) },
                            { key: 'tti', name: 'TTI', value: metrics.tti + ' ms', class: getMetricClass('tti', metrics.tti) }
                        ];
                        $scope.hasData = true;

                        // Update historical data
                        historicalData.push({ timestamp: Date.now(), metrics });
                        chrome.storage.local.set({ historicalData });

                        // Display chart if canvas exists
                        const canvas = document.getElementById('metricsChart');
                        if (canvas) {
                            displayChart(canvas, historicalData);
                        }
                    });
                } else {
                    $scope.$applyAsync(() => {
                        $scope.hasData = false;
                        $scope.error = 'No data available. Please refresh the page.';
                    });
                }
            });
        });
    };



    // probably won't end up using this
    const displayChart = (canvas, historicalData) => {
        const ctx = canvas.getContext('2d');
        const labels = historicalData.map(data => new Date(data.timestamp).toLocaleTimeString());
        const datasets = $scope.metrics.map(metric => {
            return {
                label: metric.name,
                data: historicalData.map(data => data.metrics[metric.key]),
                borderColor: getMetricClass(metric.key, historicalData[0].metrics[metric.key]),
                fill: false
            };
        });

        new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets
            },
            options: {
                responsive: true,
                scales: {
                    x: { display: true, title: { display: true, text: 'Time' } },
                    y: { display: true, title: { display: true, text: 'Value' } }
                }
            }
        });

        $scope.historicalDataAvailable = true;
    };

    $scope.refreshPage = () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tabId = tabs[0].id;
            chrome.tabs.reload(tabId, () => {
                $timeout(loadMetrics, 1000); // Timeout
            });
        });
    };

    const loadSettings = () => {
        try {
            chrome.storage.local.get('settings', (data) => {
                $scope.$applyAsync(() => {
                    $scope.settings = data.settings || $scope.settings;
                    loadMetrics();
                });
            });
        } catch (error) {
            $scope.$applyAsync(() => {
                $scope.error = 'Failed to load settings. Please try again.';
            });
        }
    };

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'updateSettings') {
            loadSettings();
            loadMetrics();
        }
    });

    loadSettings();
    loadMetrics(); // Initial load
}]);
