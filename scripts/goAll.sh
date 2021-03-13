cd $(dirname $0)
#cd ../src
echo 'pg starting'
service postgresql start
while ! pg_isready 
do 
    echo "`date` - waiting for database to start"
    echo "`pg_isready`"
    sleep 10 
done
#runuser -l postgres -c 'psql < /init.sql'

deno run --allow-env --allow-net --allow-read main.ts
