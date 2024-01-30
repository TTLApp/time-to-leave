module.exports = {
    checkLeaks: true,
    color: true,
    parallel: true,
    require: [
        '@babel/register',
        '@babel/plugin-transform-modules-commonjs'
    ]
};
