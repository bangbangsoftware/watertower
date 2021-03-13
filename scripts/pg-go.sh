if [ ! pg_isready ]
  then 
    sudo service postgresql start
    while ! pg_isready 
    do 
        echo '$(date) - waiting for database to start'
        sleep 10 
    done
    psql < init.sql 
fi 

echo 'pg is going already'

deno run --allow-env --allow-net index.ts
