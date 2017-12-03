var fs = require('fs-extra');
var path = require('path');
var dir = './build/static/js';

var dest = path.resolve(__dirname, '../godot-snake-ai-trainer/dist/app/dashboard/static/js');
var indexPath = path.resolve(__dirname, '../godot-snake-ai-trainer/dist/app/dashboard');

fs.readdir(dir, function(err, items) {
    const mainJs = items.filter(one => one.indexOf('map') === -1)[0];
    console.log('New Main.js: ', mainJs);
    const jsFile = path.resolve(__dirname, dir + '/' + mainJs);
    var index = fs.readFileSync(indexPath + '/index.html', 'utf8');
    fs.readdir(dest, function(err, files) {
        const oldJsFile = files.filter(one => one.indexOf('main') !== -1)[0];
        console.log('Old Main.js: ', oldJsFile);
        const newIndex = index.replace(oldJsFile, mainJs);
        fs.writeFileSync(indexPath + '/index.html', newIndex);
        fs.unlink(dest + '/' + oldJsFile);
        fs.copySync(jsFile, dest + '/' + mainJs);
        console.log('--- deployed ---');
    });
});
