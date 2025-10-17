from datetime import datetime, timedelta
import os
import asyncio
import socket
import traceback

# Initialize decky-loader settings manager
from settings import SettingsManager

import decky

settings_dir = decky.DECKY_PLUGIN_SETTINGS_DIR

script_dir = decky.DECKY_PLUGIN_DIR
pidfile = decky.DECKY_PLUGIN_RUNTIME_DIR + "/decky-filebrowser.pid"
SAVE_CURRENT_TIME_SCRIPT = settings_dir + "/SaveCurrentTime.sh"
LAST_ACTION_TIME_FILE = settings_dir + "/lastActionTime.txt"

# Strings useful for starting File Browser
filebrowser_bin = decky.DECKY_PLUGIN_DIR + "/bin/filebrowser/filebrowser"
filebrowser_database_path = decky.DECKY_PLUGIN_SETTINGS_DIR + "/filebrowser.db"
filebrowser_settings_path = decky.DECKY_PLUGIN_SETTINGS_DIR + "/settings.json"
filebrowser_cert_path = decky.DECKY_PLUGIN_DIR + "/bin/certs/cert.pem"
filebrowser_key_path = decky.DECKY_PLUGIN_DIR + "/bin/certs/key.pem"
filebrowser_default_port = 8082
filebrowser_default_address = "0.0.0.0"
filebrowser_log_path = decky.DECKY_PLUGIN_LOG_DIR + "/filebrowser-log.txt"

# Load user's settings
settings = SettingsManager(name="settings", settings_directory=settings_dir)
settings.read()

class Plugin:

    async def runCommand(self: 'Plugin', command):
        decky.logger.info("Running command: " + command)
        try:
            process = await asyncio.create_subprocess_shell(command, shell=True, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE, env=self._get_clean_env())

            output, error = await process.communicate()
            output_str = output.decode("utf-8") if output else ""
            error_str = error.decode("utf-8") if error else ""
            return (output_str, error_str)
        except Exception as e:
            decky.logger.error(f"Failed to run command: {traceback.format_exc(e)}")
            return ("", f"Exception occurred: {e}")
        
        
    async def isFileBrowserOnline(self: 'Plugin'):

        if not os.path.exists(pidfile):
            return False
        
        with open(pidfile, "r") as file:
            pid_str = file.read().strip()

        CheckPidCommand = f" ps -o command {pid_str} "

        output_str, error_str = await self.runCommand(CheckPidCommand)

        if "filebrowser" in output_str:
            return True
        
        os.remove(pidfile)
        return False


    async def getFileBrowserStatus(self: 'Plugin'):
        try:
            if not await self.isFileBrowserOnline():
                decky.logger.info("The server is not online.")
                return {
                    "status": "offline",
                    "port": settings.getSetting("port")
                }

            with open( pidfile, "r" ) as file:
                pid_str = file.read().strip()

            hostname = socket.gethostname()
            ipv4_address = socket.gethostbyname(hostname)

            decky.logger.info(f'The server is online. pid {pid_str} - ipv4_address {ipv4_address} - port {settings.getSetting("port")}')

            return {
                "status": "online",
                "pid": pid_str,
                "ipv4_address": ipv4_address,
                "port": settings.getSetting("port")
            }
        except Exception as e:
            decky.logger.error(f"Exception occurred: {traceback.format_exc(e)}")


    async def startFileBrowser( self, port = filebrowser_default_port ):
        try:
            if await self.isFileBrowserOnline():
                decky.logger.info("The server has already been started. Stopping it first.")
                await self.stopFileBrowser()

            if(port is None or (isinstance(port, str) and not port.isdigit())):
                decky.logger.warning("Port Number is not numeric, resetting it.")
                settings.setSetting( "port", filebrowser_default_port )

            if not self.is_port_free(port):
                msg = f"Port {port} is already in use."
                decky.logger.warning("The server could not be started: " + msg)
                return {
                    "status": "error",
                    "output": msg
                }
            

            command = f"{filebrowser_bin} -c {filebrowser_settings_path}"
            decky.logger.info("Running FileBrowser command: " + command)

            process = await asyncio.create_subprocess_shell(command, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE, env=self._get_clean_env())
            await asyncio.sleep(0.2) # T    his is needed since the file browser needs some time to start the process and show errors
            decky.logger.info(f"Process RC is: {process.returncode}")

            if(process.returncode is None):
                with open(pidfile, "w+") as file:
                    file.write(str(process.pid))
                decky.logger.info(f"The server is running. Process ID is: {process.pid}")
                return {
                    "status": "online",
                    "pid": process.pid
                }
            else:
                decky.logger.error("The server could not be started.")
                stdout = await process.stdout.read(300)
                stderr = await process.stderr.read(300)
                decky.logger.error(stdout.decode("utf-8"))
                decky.logger.error(stderr.decode("utf-8"))
                decky.logger.error("Maybe there's something wrong with the DB? The DeckyFileBrowser will try toselfrepair.")
                await self.check_settings()
                return {
                    "status": "offline",
                    "output": "none"
                }
        except Exception as e:
            decky.logger.error(traceback.format_exc(e))


    async def stopFileBrowser(self: 'Plugin'):
        try:
            if not await self.isFileBrowserOnline():
                decky.logger.info("No server is currently running (no pidfile found).")
                return {
                    "status": "offline",
                    "output": "none"
                }

            with open(pidfile, "r") as file:
                pid_str = file.read().strip()

            decky.logger.info(f"The process ID is {pid_str}. Attempting to kill it.")
            killCommand = f"kill {pid_str}"

            output_str, error_str = await self.runCommand(killCommand)

            if error_str != "":
                decky.logger.error(f"Failed to kill process {pid_str}: {error_str}")
            else:
                decky.logger.info(f"Process {pid_str} killed successfully.")

            os.remove(pidfile)
            decky.logger.info(f"pidfile {pidfile} removed successfully.")

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
            decky.logger.error(f"Exception occurred: {traceback.format_exc(e)}")


    async def logInfo( self, msg = "Javascript: no content" ):
        decky.logger.info(msg)


    async def logError( self, msg = "Javascript: no content" ):
        decky.logger.error(msg)


    async def get_setting( self, key ):
        return settings.getSetting( key )
    

    async def save_user_settings( self, key: str, value ):
        decky.logger.info("Changing settings - {}: {}".format( key, value ))
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

            decky.logger.warning(f"Saving new credentials for user: {oldUsername}.")

            command = f'{filebrowser_bin} users update "{oldUsername}" -d "{filebrowser_database_path}" -u "{username}" -p "{newPassword}"'
            output_str, error_str = await self.runCommand(command)

            if(output_str == ""):
                decky.logger.info(error_str)
                raise Exception("Could not change the user credentials, please verify if the current username is correct in the JSON settings file.")
            
            settings.setSetting( "currentUsername", newUsername)
            decky.logger.warning("New credentials were saved successfully.")
            return {
                "output": "success"
            }
        except Exception as e:
            decky.logger.error("Could not fully save settings. Please verify what went wrong.")
            decky.logger.error(f"Exception occurred: {traceback.format_exc(e)}")


    async def hashString( self, text: str ):
        command = f"{filebrowser_bin} hash {text}"
        output_str, error_str = await self.runCommand(command)

        if(error_str != ""):
            raise Exception("Could not hash the given string.")
        
        decky.logger.info(f"generated hash: {output_str}")
        return output_str

    async def reset_settings(self: 'Plugin'):
        settings.setSetting( "port", filebrowser_default_port )
        settings.setSetting( "address", filebrowser_default_address)
        settings.setSetting( "database", filebrowser_database_path)
        settings.setSetting( "key", filebrowser_key_path)
        settings.setSetting( "cert", filebrowser_cert_path)
        settings.setSetting( "root", decky.DECKY_USER_HOME)
        settings.setSetting( "log", filebrowser_log_path)


    async def filebrowser_init(self: 'Plugin'):
        command = f"{filebrowser_bin} -c {filebrowser_settings_path}"
        process = await asyncio.create_subprocess_shell(command, shell=True, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE, env=self._get_clean_env())
        await asyncio.sleep(0.2)
        process.kill()
        decky.logger.info("Filebrowser database was successfully initialized.")
        return "success"
    

    def is_port_free(self, port):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('localhost', port)) != 0


    async def check_settings(self: 'Plugin'):
        try:
            test = settings.getSetting("port")
            test_2 = settings.getSetting("address")
            test_3 = settings.getSetting("database")
            if any(var is None for var in [test, test_2, test_3]):
                decky.logger.warning("Could not find the configurations for file browser, recreating it wi_get_clean_envth default values.")
                await self.reset_settings()
            
            if not os.path.exists(filebrowser_database_path):
                settings.setSetting( "currentUsername", "admin")
                decky.logger.warning("Filebrowser database file not found. Initializing a new database...")
                await self.filebrowser_init()
                decky.logger.warning("The username and password was set to 'admin'. It is advisable to change it.")
        except Exception as e:
            decky.logger.error("Could not fully set the configurations for file browser. It may not work properly.")
            decky.logger.error(traceback.format_exc(e))
    

    async def remove_file_browser_files(self):
        try:
            if os.path.exists(filebrowser_settings_path):
                os.remove(filebrowser_settings_path)
        except:
            decky.logger.error(f"it was not possible to delete file {filebrowser_settings_path}")

        try:
            if os.path.exists(filebrowser_database_path):
                os.remove(filebrowser_database_path)
        except:
            decky.logger.error(f"it was not possible to delete file {filebrowser_settings_path}")

        try:
            if os.path.exists(SAVE_CURRENT_TIME_SCRIPT):
                os.remove(SAVE_CURRENT_TIME_SCRIPT)
        except:
            decky.logger.error(f"it was not possible to delete file {SAVE_CURRENT_TIME_SCRIPT}")

    def _get_clean_env(self):
        env = os.environ.copy()
        env["LD_LIBRARY_PATH"] = ""
        return env


    # Asyncio-compatible long-running code, executed in a task when the plugin is loaded
    async def _main(self: 'Plugin'):
        decky.logger.info("Hello World!")
        if os.path.exists(pidfile):
            os.remove(pidfile)
        decky.logger.info("Running settings check for the file browser...")
        await self.check_settings()


    # Function called first during the unload process, utilize this to handle your plugin being removed
    async def _unload(self: 'Plugin'):
        if await self.isFileBrowserOnline():
            decky.logger.info("Closing DeckyFileBrowser. Stopping server instance...")
            await self.stopFileBrowser()
        decky.logger.info("Goodbye World!")
        pass

    # Function called first during the uninstall process, utilize this to handle your plugin being uninstalled
    async def _uninstall(self: 'Plugin'):
        decky.logger.warning(f"Attempting to uninstall DeckyFileBrowser")

        if await self.isFileBrowserOnline():
            decky.logger.warning("Closing DeckyFileBrowser. Stopping server instance...")
            await self.stopFileBrowser()

        await self.remove_file_browser_files()
