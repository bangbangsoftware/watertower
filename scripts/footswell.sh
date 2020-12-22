cd $(dirname $0)
cd ../../binder
npm run build

cd -
cp -r ../../binder/footswell/* ../public/.
cp -r ../../binder/src ../public/.
