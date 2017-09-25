const gulp = require('gulp');
const polymer2migrator = require('./gulp-index.js');

gulp.task('migrate', function() {
	gulp.src('demoSource/*.html')
		.pipe(polymer2migrator())
		.pipe(gulp.dest('output'))
})

gulp.task('default',['migrate']);
