cd $(dirname $0)
rm ../public/dist/watertower.js.map
rm ../public/dist/watertower.js
rm ../public/src/watertower.js
rm ../../scoreboard/watertower.js.map
rm ../../scoreboard/watertower.js
rm ../../binder/footswell/dist/watertower.js.map
rm ../../binder/footswell/dist/watertower.js
rm ../../binder/dist/watertower.js.map
rm ../../binder/dist/watertower.js

cd ../../binder
npm run build

cd -
cp -r ../../binder/footswell/* ../public/.
cp -r ../../binder/src ../public/.
rm ../public/watertower.js*
