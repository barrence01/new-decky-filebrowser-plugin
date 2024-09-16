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
filebrowser_bin = decky_plugin.DECKY_PLUGIN_DIR + "/bin/filebrowser/filebrowser"
filebrowser_database_path = decky_plugin.DECKY_PLUGIN_SETTINGS_DIR + "/filebrowser.db"
filebrowser_settings_path = decky_plugin.DECKY_PLUGIN_SETTINGS_DIR + "/settings.json"
filebrowser_cert_path = decky_plugin.DECKY_PLUGIN_DIR + "/bin/certs/cert.pem"
filebrowser_key_path = decky_plugin.DECKY_PLUGIN_DIR + "/bin/certs/key.pem"
filebrowser_default_port = 8082
filebrowser_default_address = "0.0.0.0"

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

            if(port is None or (isinstance(port, str) and not port.isdigit())):
                decky_plugin.logger.warning("Port Number is not numeric, resetting it.")
                settings.setSetting( "port", filebrowser_default_port )

            if not self.is_port_free(port):
                msg = f"Port {port} is already in use."
                decky_plugin.logger.warning("The server could not be started: " + msg)
                return {
                    "status": "error",
                    "output": msg
                }
            

            command = f"{filebrowser_bin} -c {filebrowser_settings_path}"
            decky_plugin.logger.info("Running FileBrowser command: " + command)

            process = await asyncio.create_subprocess_shell(command, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
            await asyncio.sleep(0.2) # This is needed since the file browser needs some time to start the process and show errors

            if(process.returncode is None):
                with open(pidfile, "w+") as file:
                    file.write(str(process.pid))
                decky_plugin.logger.info(f"The server is running. Process ID is: {process.pid}")
                return {
                    "status": "online",
                    "pid": process.pid
                }
            else:
                decky_plugin.logger.error("The server could not be started.")
                stdout = await process.stdout.read(300)
                decky_plugin.logger.error(stdout.decode("utf-8"))
                return {
                    "status": "offline",
                    "output": "none"
                }
        except Exception as e:
            decky_plugin.logger.error(e)


    async def stopFileBrowser( self ):
        try:
            if not os.path.exists(pidfile):
                decky_plugin.logger.info("No server is currently running (no pidfile found).")
                return {
                    "status": "offline",
                    "output": "none"
                }

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
    
    
    async def save_username_password( self, username: str, password: str):
        try:
            if(username is None or username == ""):
                raise Exception(f"The username field was not provided.")
            
            if(password is None or password == ""):
                raise Exception(f"The password field was not provided.")
            
            oldUsername = settings.getSetting("currentUsername")
            newUsername = username
            newPassword = password

            decky_plugin.logger.warning(f"Saving new credentials for user: {oldUsername}.")
            command = f'{filebrowser_bin} users update "{oldUsername}" -d "{filebrowser_database_path}" -u "{username}" -p "{newPassword}"'
            process = await asyncio.create_subprocess_shell(command, shell=True, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
            
            output, error = await process.communicate()
            output_str = output.decode("utf-8")
            output2_str = error.decode("utf-8")

            if(output_str == ""):
                decky_plugin.logger.info(output2_str)
                raise Exception("Could not change the user credentials, please verify if the current username is correct in the JSON settings file.")
            
            settings.setSetting( "currentUsername", newUsername)
            decky_plugin.logger.warning("New credentials were saved successfully.")
            return {
                "output": "success"
            }
        except Exception as e:
            decky_plugin.logger.error("Could not fully save settings. Please verify what went wrong.")
            decky_plugin.logger.error(e)


    async def hashString( self, text: str ):
        command = f"{filebrowser_bin} hash {text}"
        process = await asyncio.create_subprocess_shell(command, shell=True, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
        output, error = await process.communicate()
        output_str = output.decode("utf-8")
        error_str = error.decode("utf-8")
        if(error_str != ""):
            raise Exception("Could not hash the given string.")
        decky_plugin.logger.info(f"generated hash: {output_str}")
        return output_str
        

    async def reset_settings( self ):
        settings.setSetting( "port", filebrowser_default_port )
        settings.setSetting( "address", filebrowser_default_address)
        settings.setSetting( "database", filebrowser_database_path)
        settings.setSetting( "key", filebrowser_key_path)
        settings.setSetting( "cert", filebrowser_cert_path)
        settings.setSetting( "root", decky_plugin.DECKY_USER_HOME)


    async def filebrowser_init( self ):
        command = f"{filebrowser_bin} -c {filebrowser_settings_path}"
        process = await asyncio.create_subprocess_shell(command, shell=True, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
        await asyncio.sleep(0.2)
        process.kill()
        decky_plugin.logger.info("Filebrowser database was successfully initialized.")
        return "success"
    

    def is_port_free(port):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('localhost', port)) != 0


    async def check_settings( self ):
        try:
            test = settings.getSetting("port")
            test_2 = settings.getSetting("address")
            test_3 = settings.getSetting("database")
            if any(var is None for var in [test, test_2, test_3]):
                decky_plugin.logger.warning("Could not find the configurations for file browser, recreating it with default values.")
                await self.reset_settings(self)
            
            if not os.path.exists(filebrowser_database_path):
                settings.setSetting( "currentUsername", "admin")
                decky_plugin.logger.warning("Filebrowser database file not found. Initializing a new database...")
                await self.filebrowser_init(self)
                decky_plugin.logger.warning("The username and password was set to 'admin'. It is advisable to change it.")
        except Exception as e:
            decky_plugin.logger.error("Could not fully set the configurations for file browser. It may not work properly.")
            decky_plugin.logger.error(e)


    # Asyncio-compatible long-running code, executed in a task when the plugin is loaded
    async def _main(self):
        decky_plugin.logger.info("Hello World!")
        if os.path.exists(pidfile):
            os.remove(pidfile)
        decky_plugin.logger.info("Running settings check for the file browser...")
        await self.check_settings(self)


    # Function called first during the unload process, utilize this to handle your plugin being removed
    async def _unload(self):
        if os.path.exists(pidfile):
            decky_plugin.logger.info("Closing DeckyFileBrowser. Stopping server instance...")
            self.stopFileBrowser(self)
        decky_plugin.logger.info("Goodbye World!")
        pass

