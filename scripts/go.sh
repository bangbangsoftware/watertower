
test=`pg_isready`
if [[ $test != *"accepting connections"* ]];
  then 
    echo 'pg starting'
    sudo service postgresql start
    # Adjust PostgreSQL configuration so that remote connections to the
    # database are possible.
    ## RUN echo "host all  all    0.0.0.0/0  md5" >> /etc/postgresql/13/main/pg_hba.conf

    # And add ``listen_addresses`` to ``/etc/postgresql/13/main/postgresql.conf``
    ## RUN echo "listen_addresses='*'" >> /etc/postgresql/13/main/postgresql.conf

    while ! pg_isready 
    do 
        echo '$(date) - waiting for database to start'
        sleep 10 
    done
    sudo runuser -l postgres -c 'psql < /workspaces/watertower/scripts/init.sql'
    #sudo su postgres
    #psql < init.sql 
    #sudo su vscode
fi 

echo "pg is going already - $test"

deno run --allow-net --allow-read main.ts