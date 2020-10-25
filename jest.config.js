module.exports = {
    collectCoverage: true,
    coverageDirectory: 'coverage_jest',
    collectCoverageFrom: ['js/**.js','js/classes/**.js','src/**.js','./main.js'],
    projects: [
        {
            displayName: '    MAIN',
            runner: '@jest-runner/electron/main',
            testEnvironment: 'node',
            testMatch: ['**/__tests__/**main**/*.js']
        },
        {
            displayName: 'RENDERER',
            runner: '@jest-runner/electron',
            testEnvironment: '@jest-runner/electron/environment',
            testMatch: ['**/__tests__/**renderer**/*.js', '**/__tests__/**renderer**/classes/*.js']
        }
    ]
};
