# Application Lifecycle

## Initialization
    
The application starts by registering it's connection to the Pusher channel that it is assigned to and
sending a tick to the notification engine that it is online.
    
At that time, the application initializes a new sub process that provides an RPC endpoint for the server that will be created.
    
Once the sub process has started and emitted the "RPC_ENDPOINT_EXPOSED" to STDOUT the initialization process moves on.

If for any reason the RPC process suffers a failure - the game server will be made to undergo a graceful shutdown and restart.

Once the RPC Endpoint is succesfully established, the game server will be started.  

The process waits until the server emits "Game Port: XXXX, Steam Query Port: XXXX" which indicates that it is ready to receive traffic.

At this point, SIGREP proceeds to create the BattleEye RCON client responsible for connecting to the server.

The client will connect to the server and then immediately lock the server. 
From there it will query the 1st-rrf website for it's assigned mission and load it onto the server.
It will also enable metrics and verify that they are being correctly received by SIGREP before continuing.

Once the mission has been loaded, metrics have been received and the server has verified its connection to both
the RPC and BattleEye endpoints; SIGREP will issue an unlock command causing the server to be available to accept traffic.

## Uptime

Whilst the server is operational and no faults have been detected in the independent runtimes - the server will continue to
operate normally until a shutdown command is received or one of the daily reset times is reached.

The following tasks are undertaken during that time by SIGREP:

1. On receiving a Monitor message from the server's RCON connection SIGREP will place this data into Keen for analysis
and recording.

2. Once a minute SIGREP will push to the Pusher channel the latest uptime information about its subcomponents and performance

3. SIGREP will monitor the Pusher channel for any inbound commands and disptch them to the CommandHandler

4. SIGREP will evaluate itself to ensure that its internal components are functional and begin a controlled shutdown.
It will also initiate a text message to all members of the officer corps notifying them of a detected instability.

## Daily Routines

### Restarts

The server undergoes two restarts a day so that it is never running for more than 12 consecutive hours. The restarts
are placed at times that should not interrupt gameplay too badly but will mean that the server will be freshly restarted
ahead of peak playtimes to prevent overrunning memory leaks.
Restarts should take less than two minutes and should not impact gameplay majorly due to the presence of Fusion.

These restarts are scheduled to take place at 7AM GMT and 7PM GMT.

The server issues warnings for 30 minutes every 5 minutes before shutdown. It will also lock the server 10 minutes before the
restart to prevent new players from joining. 3 minutes before the restart the server will kick all remaining players from the server so that fusion has time to persist the mapstate.

During the restart SITREP will undertake the following tasks:
   
1. Delete all missions and clone the master branch of the 1st-rrf's mission repository from GitHub into the missions folder

2. Eventually we will upload the log's to Amazon S3 but for now we will not

## Shutdown

SIGREP is designed to not need to be restarted. For the planned server downtime on Monday mornings when the new modpack is deployed
SIGREP should be put into update mode via the web control panel. This will cause it to shutdown the server and the endpoints until further notice.

If a server shutdown or restart is requested the controlled restart sequence is undertaken. This consists of closing the components in reverse order ( Close BattleEye - Kill Server - Terminate RPC )

If one of the components suffers a failure then an degraded restart is undertaken. A degraded restart will clean up any components
which have not suffered a failure to get it back to the initialization point. It will then undertake a normal start sequence.

