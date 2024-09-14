import {
  ButtonItem,
  definePlugin,
  PanelSection,
  PanelSectionRow,
  ServerAPI,
  staticClasses,
  Navigation,
} from "decky-frontend-lib";
import { useContext, useEffect, useState, VFC } from "react";
import { FaServer } from "react-icons/fa";
import { QRCodeSVG } from 'qrcode.react';
import Settings from './settings';
import { AppContext, AppContextProvider } from './utils/app-context';
import FileBrowserManager from './state/filebrowser-manager';

const Content: VFC = () => {
  const [ isLoading, setIsLoading ] = useState( false );
  const [ serverStatus, setServerStatus ] = useState( false );
  const [ serverIP, setServerIP ] = useState( "127.0.0.1" );
  const [ processPID, setProcessPID ] = useState( -1 );
  const [ port, setPort ] = useState( null );
  const [errorMessage, setErrorMessage] = useState(""); // Error message state

  // @ts-ignore
  const { fileBrowserManager } = useContext(AppContext);
  //const serverApi = fileBrowserManager.getServer();

  const isServerRunning = serverStatus && processPID > 0;

  const handleStartServer = async () => {
    try{
      if ( isServerRunning ) {
        console.log( 'Server is running, closing' );
        const result = await fileBrowserManager.stopFileBrowser();

        if (result.result?.status && (result.result?.status == "offline")) {
          setProcessPID( -1 );
          setServerStatus( false );
          console.log( 'Server closed' );
        } else {
          console.log( 'Failed to close the server', result );
          showError('Failed to close the server');
          await fileBrowserManager.fileBrowserSendLogError('Failed to close the server' + result);
        }
        return;
      }

      const result = await fileBrowserManager.startFileBrowser();

      if (result.result?.status && (result.result?.status == "online")) {
        await fileBrowserManager.getFileBrowserStatus();
        setPort(fileBrowserManager.getPort());
        setServerIP(fileBrowserManager.getIPV4Address());
        setServerStatus(fileBrowserManager.isServerRunning());
        setProcessPID(fileBrowserManager.getPID());
      } else {
        console.error( 'Failed to start the server', result );
        showError('Failed to start the server');
        await fileBrowserManager.fileBrowserSendLogError('Failed to start the server' + result);
      }
    } catch (error) {
      console.error('Failed to toggle file browser', error);
      await fileBrowserManager.fileBrowserSendLogError('Failed to toggle file browser' + error);
    }
  }

  const handleGoToSettings = () => {
    Navigation.CloseSideMenus();
    Navigation.Navigate("/decky-filebrowser-settings")
  }

  useEffect( () => {
    const loadStatus = async () => {
      try{
        setIsLoading( true );
        await fileBrowserManager.getFileBrowserStatus();
        if(fileBrowserManager.isServerRunning()) {
          setPort(fileBrowserManager.getPort());
          setServerStatus(fileBrowserManager.isServerRunning());
          setProcessPID(fileBrowserManager.getPID());
          setServerIP(fileBrowserManager.getIPV4Address());
        } else {
          setServerStatus(fileBrowserManager.isServerRunning());
          setPort( fileBrowserManager.getPort());
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load file browser status', error);
        showError('Failed to load file browser status');
        await fileBrowserManager.fileBrowserSendLogError('Failed to load file browser status' + error);
      }
    };

    loadStatus();
  }, []);

  const showError = (message: string) => {
    setErrorMessage(message);
    setTimeout(() => {
      setErrorMessage("");
    }, 4000);
  };

  return (
    <>
      <PanelSection title={ isServerRunning ? "Server ON" : "Server OFF" }>
        {errorMessage && (
            <PanelSectionRow>
              <div style={{ color: 'red', fontWeight: 'bold' }}>
                {errorMessage}
              </div>
            </PanelSectionRow>
          )}
        <PanelSectionRow>
          <ButtonItem layout="below"
            onClick={handleStartServer}
            disabled={ isLoading }
          >
            { isServerRunning ? "Stop Server" : "Start Server" }
          </ButtonItem>
        </PanelSectionRow>

        { isServerRunning ? (
          <>
            <PanelSectionRow>
              { `https://${serverIP}:${port}` }
            </PanelSectionRow>
            <PanelSectionRow>
                <QRCodeSVG
                  value={ `https://${serverIP}:${port}` }
                  size={256}
                />

            </PanelSectionRow>
          </>
        ) : (
          <>
            <PanelSectionRow>
              <ButtonItem
                layout="below"
                onClick={ handleGoToSettings }
                disabled={ isLoading }
              >
                Go to Settings
              </ButtonItem>
            </PanelSectionRow>
          </>
          )
        }
      </PanelSection>
      <PanelSection title={ "Current Settings" }>
        { isLoading ?
          "Loading..."
          : (
            <PanelSectionRow>
              Port: { port }
            </PanelSectionRow>
          )
        }
      </PanelSection>
      <PanelSection title={ "Information" }>
        <PanelSectionRow>
          <p>Make sure your SteamDeck and the devices you are accessing the files with are on the same network.</p>
        </PanelSectionRow>
      </PanelSection>
    </>
  );
};



export default definePlugin((serverApi: ServerAPI) => {
  const fileBrowserManager = new FileBrowserManager( serverApi );

  serverApi.routerHook.addRoute("/decky-filebrowser-settings", () => (
      <AppContextProvider fileBrowserManager={fileBrowserManager}>
      <Settings />
    </AppContextProvider>
  ), {
    exact: true,
  });


  return {
    title: <div className={staticClasses.Title}>File Browser</div>,
    content: (
      <AppContextProvider fileBrowserManager={fileBrowserManager} >
        <Content />
      </AppContextProvider>
    ),
    icon: <FaServer />,
    onDismount: () => {
      serverApi.routerHook.removeRoute("/decky-filebrowser-settings");
    }
  };
});
