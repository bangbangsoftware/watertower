heroku container:login
if [ -z "$1" ]; then
  heroku apps 
else        
  heroku container:push web -a $1
  heroku container:release web -a $1
  heroku open -a $1
  heroku logs --tail -a $1
fi

