var gulp = require('gulp');
var rsync = require('gulp-rsync');
var GulpSSH = require('gulp-ssh');
var fs = require('fs');

const deploy = function() {
  return gulp.src(['./build', './build/**', './swagger.json', './package.json', './package-lock.json'])
    .pipe(rsync({
      root: __dirname,
      hostname: '212.42.196.109',
      username: "abm",
      destination: '~/INeed/API/',
      archive: true,
      silent: false,
      compress: true
    }));
};

gulp.task('deploy', deploy);

// var gulpSSH = new GulpSSH({
//   ignoreErrors: false,
//   sshConfig: {
//     host: '40.76.5.158',
//     port: 22,
//     username: 'dev',
//     privateKey: fs.readFileSync('/home/vahan/.ssh/id_rsa')
//   }
// });



// gulp.task('deploy-restart', [ 'deploy' ], function() {
//   return gulpSSH
//     .shell(['cd /home/dev/FreeMo.Mobile.API/', 'npm install --only=production', 'cd /home/dev/FreeMo.Mobile.API/', 'pm2 start FreeMo.Mobile.API.DEV.json'])
//     .pipe(gulp.dest('logs'))
// });