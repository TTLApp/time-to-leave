
function isTestFile(arg)
{
    return arg.match(/\.[m]js?$/);
}

let mochaSpecs = {};
let allTestFiles = [];

const isElectronMocha = process.argv[0].indexOf('electron') !== -1;
if (isElectronMocha)
{
    allTestFiles = ['__tests__/__main__/*.mjs', '__tests__/__renderer__/*.mjs', '__tests__/__renderer__/classes/*.mjs'];
}
else
{
    allTestFiles = ['tests/main-window.mjs'];
    mochaSpecs = {
        checkLeaks: true,
        parallel: true
    };
}

module.exports = {
    color: true,
    ...mochaSpecs,
    // This allows overriding the test on the cmd line when using this .cjs config file
    ...(process.argv.slice(2).some(isTestFile) ? {} : {spec: allTestFiles})
};
