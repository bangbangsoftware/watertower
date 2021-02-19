cd $(dirname $0)
#echo "docker build ../. --build-arg POSTGRES_PASSWORD=\`openssl rand -base64 14\` -t footswell:$1"
#echo
#./footswell.sh # until wget
touch ../public/dist/watertower.jswhat
rm ../public/dist/watertower.js*

touch ../public/dist/watertower.jswhat
rm ../public/dist/watertower.js*

touch ../public/src/watertower.jswhat
rm ../public/src/watertower.js*

touch ../../scoreboard/watertower.jswhat
rm ../../scoreboard/watertower.js*

touch ../../binder/footswell/dist/watertower.jswhat
rm ../../binder/footswell/dist/watertower.js*

touch ../../binder/dist/watertower.jswhat
rm ../../binder/dist/watertower.js*

echo "footswell in binder"
cd ../../binder
npm run build
cd -

rm ../public/*
cp -r ../../binder/footswell/* ../public/.
cp -r ../../binder/src ../public/.

echo "scoreboard"
cp -r ../../scoreboard/scoreboard.* ../public/.
cp -r ../../scoreboard/*.ttf ../public/.

# If apt is failing... try the below with no cache....
#docker build --no-cache  ../. --build-arg POSTGRES_PASSWORD=`openssl rand -base64 14` -t footswell:$1
docker build ../. --build-arg POSTGRES_PASSWORD=`openssl rand -base64 14` -t footswell:$1
cd -
