FROM node:16

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

EXPOSE 3000
CMD [ "node", "app.js" ]

### Cloud architecture
# I'll be trying to make several points on scaling, starting from what it is,
# a non stateless application that holds the state inside.
# Disclosure: Mostly structured following this course
# (https://www.udemy.com/course/system-design-interview-prep/)
# that I did some weeks ago and it was good for that, structuring ideas
# that some I had been exposed to and some not.
#
## Vertical scaling
# Initially maybe the easiest way of scaling is vertical scalling, this
# means increasing the performance of that only deployment usually by
# hosting it in a bigger server.
# The only upside of this solution is that the maintenance and complexity
# don't increase, but it is still a non professional set up with a clear
# Single Point of Failure
# Maybe, on a side note it could be migrated to Go, Rust or C...
#
# Starting to scale out, separating the DB
# This would mean taking the storage out of this service and modifying
# the repository for connecting with an external DB.
# Different options:
#
# 1. The usual relational DB
#   Using indices over the price, and then ACID transactions over just the
#   rows being matched it could keep up with quite a lot of concurrency if
#   the orders are in different price ranges.
#   Optimistic locking can be used as well, but it only has better
#   performance on light loads
#
# 2. No SQL Db.
#   There are a lot of options, from Redis, where if it would be possible
#   to use its counters and atomic counter operations it would awesome, to
#   others like Couchbase, used a lot in gaming (e.g. settlement of a sports
#   event - although cannot totally describe it now, 5 years since I was
#   exposed to that)
#
# Horizontal scaling - replicating servers
#   Once the state is out of the service, a lot of copies of the server
#   can be deployed.
#   A load balancer comes into play if done dockerized in a basic form,
#   using Kubernetes, Docker Swarm, AWS Fargate usually this comes embedded
#
# Scaling the -relational- Db
#   Different failover strategies, hot standby the most useful, writes are simultaneous
#   on different DB replicas and then reads can happen in any of them.
#   In this case only useful for the GET endpoint, given that the POST
#   would need to block rows even for its reads (select for update).
#
#   Horizontal scaling the Db: sharding
#   The complexity increases a lot, as business information has to be taken
#   into account as for how to split the data among servers minimizing
#   the need for queries that retrieve info from serveral shards.
#   And different business requirements could need the information split
#   differently...
#
# P.S: I realized that I haven't specifically chosen an architecture, but it kind of
# comes from it. For driving the scaling of the services I always like to
# have some kind of load test giving meaningful information for discovering
# the hot spots in every moment.


### Continuous Integration pipelines
#
# Note: I'm not sure if this should be just continous integration or continuous
#   deployment.
#
## As for continuous integration
#
# Using feature branching (some would say is not continuous integration https://www.youtube.com/watch?v=v4Ijkq6Myfc, but it
# is popular anyway).
# Similar set up to my previous company:
#  - master branch with the production version. Hot fixes stem from it.
#  - develop branch, branch with the version ready for QA
#  - feature branches, branches where code is modified and code reviews done
#
#  Pipelines:
#  - One running lint and tests in every feature branch.
#  - One cutting versions and deploying develop in a QA stage whenever a branch is merged into develop
#  - Automated external tests can be run over the QA stage
#  - Another pipeline cutting versions from master when there is a merge there
#    maybe with a manually/automatically triggered pipeline to deploy in production
#
#  With no feature branching
#    - master branch in a similar fashion as the previous setup
#    - develop branch with all the live commit from daily work
#    - Code reviews are done not as pull/merge requests, but with an
#      external tool, e.g. selecting the commits
#
#  Pipelines:
#  - One for running lint and tests in develop with every commit
#  - One for deploying the develop branch to a development and QA environments
#     (manually and/or automatically triggered)
#  - When a feature is coded, QAed and reviewed, those commits are merged into master
#     Last time I worked this way it was a manual task, I don't know if current
#     tools for code reviews have a feature for this. If not tools can be done
#     for basing in the commit messages do different tasks.
#
