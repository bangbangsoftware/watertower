cd $(dirname $0)
#echo "docker build ../. --build-arg POSTGRES_PASSWORD=\`openssl rand -base64 14\` -t footswell:$1"
#echo
./footswell.sh # until wget
docker build ../. --build-arg POSTGRES_PASSWORD=`openssl rand -base64 14` -t footswell:$1
cd -