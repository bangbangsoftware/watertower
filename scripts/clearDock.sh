docker images prune
docker rmi $(docker images --filter "dangling=true" -q --no-trunc)
