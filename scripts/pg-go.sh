service postgresql start
if [ ! pg_isready ]
  then 
    service postgresql start
    while ! pg_isready 
    do 
        echo '$(date) - waiting for database to start'
        sleep 10 
    done
    echo 'trying init as `whoami`'
    psql < /init.sql 
fi 
echo 'trying init as postgres'
runuser -l postgres -c 'psql < /init.sql'
echo 'pg is going'