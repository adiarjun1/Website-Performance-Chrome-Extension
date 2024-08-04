const app = angular.module('settingsApp', []);

app.controller('SettingsController', ['$scope', ($scope) => {
    $scope.settings = {
        ttfb: true,
        ttlb: true,
        dnsLookupTime: true,
        fcp: true,
        totalPageSize: true,
        numHttpsRequests: true,
        si: true,
        lcp: true,
        fid: true,
        cls: true,
        maxFid: true,
        pageLoadTime: true,
        tti: true
    };
    $scope.error = '';

    const loadSettings = () => {
        try {
            chrome.storage.local.get('settings', (data) => {
                $scope.$applyAsync(() => {
                    $scope.settings = data.settings || $scope.settings;
                });
            });
        } catch (error) {
            $scope.$applyAsync(() => {
                $scope.error = 'Failed to load settings. Please try again.';
            });
        }
    };

    $scope.$watch('settings', (newSettings) => {
        try {
            chrome.storage.local.set({ settings: newSettings }, () => {
                chrome.runtime.sendMessage({ type: 'updateSettings' });
            });
        } catch (error) {
            $scope.$applyAsync(() => {
                $scope.error = 'Failed to save settings. Please try again.';
            });
        }
    }, true);

    loadSettings();
}]);
