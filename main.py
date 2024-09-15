import os
import asyncio
import subprocess
import socket

# Initialize decky-loader settings manager
from settings import SettingsManager

import decky_plugin

settings_dir = decky_plugin.DECKY_PLUGIN_SETTINGS_DIR

script_dir = decky_plugin.DECKY_PLUGIN_DIR
pidfile = decky_plugin.DECKY_PLUGIN_RUNTIME_DIR + "/decky-filebrowser.pid"

# Strings useful for starting File Browser
filebrowser_bin = decky_plugin.DECKY_PLUGIN_DIR + "/bin/filebrowser"
filebrowser_database_path = decky_plugin.DECKY_PLUGIN_SETTINGS_DIR + "/filebrowser.db"
filebrowser_cert_path = decky_plugin.DECKY_PLUGIN_DIR + "/bin/certs/cert.pem"
filebrowser_key_path = decky_plugin.DECKY_PLUGIN_DIR + "/bin/certs/key.pem"

# Load user's settings
settings = SettingsManager(name="settings", settings_directory=settings_dir)
settings.read()

class Plugin:
    async def getFileBrowserStatus( self ):
        try:
            if not os.path.exists( pidfile ):
                decky_plugin.logger.info("The server is not online.")
                return {
                    "status": "offline",
                    "port": settings.getSetting("port")
                }

            with open( pidfile, "r" ) as file:
                pid_str = file.read().strip()

            hostname = socket.gethostname()
            ipv4_address = socket.gethostbyname(hostname)

            decky_plugin.logger.info(f'The server is online. pid {pid_str} - ipv4_address {ipv4_address} - port {settings.getSetting("port")}')

            return {
                "status": "online",
                "pid": pid_str,
                "ipv4_address": ipv4_address,
                "port": settings.getSetting("port")
            }
        except Exception as e:
            decky_plugin.logger.error(e)


    async def startFileBrowser( self, port = 8082 ):
        try:
            if os.path.exists(pidfile):
                decky_plugin.logger.info("The server has already been started. Stopping it first.")
                await self.stopFileBrowser( self )
            
            if(isinstance(port, str) and not port.isdigit()):
                decky_plugin.logger.info("Port Number is not numeric, resetting it.")
                await self.reset_settings( self )
                port = await self.get_setting( self, "port")

            command = (
                filebrowser_bin +
                " -p " + str(port) +
                " -a 0.0.0.0" +
                " -d " + filebrowser_database_path +
                " -t " + filebrowser_cert_path +
                " -k " + filebrowser_key_path +
                " -r " + decky_plugin.DECKY_USER_HOME
            )

            decky_plugin.logger.info("Running FileBrowser command: " + command)
            process = await asyncio.create_subprocess_shell(command, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
            

            settings.setSetting("port", port)

            with open(pidfile, "w+") as file:
                file.write(str(process.pid))

            if(process.returncode is None):
                decky_plugin.logger.info(f"The server is running. Process ID is: {process.pid}")
                return {
                    "status": "online",
                    "pid": process.pid
                }
            else:
                decky_plugin.logger.error("The server could not be started.")
                return {
                    "status": "offline",
                    "output": output_str
                }
        except Exception as e:
            decky_plugin.logger.error(e)


    async def stopFileBrowser( self ):
        try:
            if not os.path.exists(pidfile):
                decky_plugin.logger.info("No server is currently running (no pidfile found).")
                return

            with open(pidfile, "r") as file:
                pid_str = file.read().strip()

            decky_plugin.logger.info(f"The process ID is {pid_str}. Attempting to kill it.")
            command = f"kill {pid_str}"
            process = await asyncio.create_subprocess_shell(command, shell=True, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)

            output, error = await process.communicate()
            output_str = output.decode("utf-8")
            error_str = error.decode("utf-8")

            if error_str != "":
                decky_plugin.logger.error(f"Failed to kill process {pid_str}: {error_str}")
            else:
                decky_plugin.logger.info(f"Process {pid_str} killed successfully.")

            os.remove(pidfile)
            decky_plugin.logger.info(f"pidfile {pidfile} removed successfully.")

            if error_str != "":
                return {
                    "status": "error",
                    "output": output_str
                }
            return {
                "status": "offline",
                "output": output_str
            }
        except Exception as e:
            decky_plugin.logger.error(e)


    async def logInfo( self, msg = "Javascript: no content" ):
        decky_plugin.logger.info(msg)

    async def logError( self, msg = "Javascript: no content" ):
        decky_plugin.logger.error(msg)

    async def get_setting( self, key ):
        return settings.getSetting( key )

    async def save_user_settings( self, key: str, value ):
        decky_plugin.logger.info("Changing settings - {}: {}".format( key, value ))
        return settings.setSetting( key, value )

    async def reset_settings( self ):
        settings.setSetting( "port", 8082 )

    # Asyncio-compatible long-running code, executed in a task when the plugin is loaded
    async def _main(self):
        decky_plugin.logger.info("Hello World!")
        if os.path.exists(pidfile):
            os.remove(pidfile)

    # Function called first during the unload process, utilize this to handle your plugin being removed
    async def _unload(self):
        decky_plugin.logger.info("Goodbye World!")
        pass

