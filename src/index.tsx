import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
  staticClasses,
  showModal,
  DialogButton
} from "@decky/ui";
import {
  definePlugin
} from "@decky/api"

import { useEffect, useState, VFC } from "react";
import { FaServer } from "react-icons/fa";
import { BsExclamationCircleFill } from "react-icons/bs";
import { QRCodeSVG } from 'qrcode.react';
import { AppContextProvider, useAppContext } from './utils/app-context';
import Settings from './settings';
import About from './components/about';
import FileBrowserManager from './state/filebrowser-manager';

const Content: VFC = () => {
  const [ isLoading, setIsLoading ] = useState( false );
  const [ serverStatus, setServerStatus ] = useState( false );
  const [ serverIP, setServerIP ] = useState<string>( "127.0.0.1" );
  const [ processPID, setProcessPID ] = useState<Number>( -1 );
  const [ port, setPort ] = useState<Number>( -1 );
  const [errorMessage, setErrorMessage] = useState<string>("");

  const { fileBrowserManager } = useAppContext();

  const isServerRunning = serverStatus && processPID > new Number(0);

  const handleStartServer = async () => {
    try{
      setIsLoading( true );
      if ( isServerRunning ) {
        console.log( 'Server is running, closing...' );
        const result = await fileBrowserManager.stopFileBrowser();

        if (result?.status && (result?.status == "offline")) {
          setProcessPID( -1 );
          setServerStatus( false );
          console.log( 'Server closed.' );
          return;
        }

        showError('Failed to close the server');
        return;
      }

      const result = await fileBrowserManager.startFileBrowser();
      if (result?.status && (result?.status == "online")) {
        await fileBrowserManager.getFileBrowserStatus();
        setPort(fileBrowserManager.getPort());
        setServerIP(fileBrowserManager.getIPV4Address());
        setServerStatus(fileBrowserManager.isServerRunning());
        setProcessPID(fileBrowserManager.getPID());
        return;
      }
      if (result?.status && (result?.status == "error")) {
        showError(result?.output);
        return;
      }

      showError('Failed to start the server');
    } catch (error) {
      console.error('Failed to toggle file browser', error);
      await fileBrowserManager.fileBrowserSendLogError('Failed to toggle file browser: ' + error);
    } finally {
      setIsLoading(false);
    }
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
        showError('Failed to load file browser status');
        await fileBrowserManager.fileBrowserSendLogError('Failed to load file browser status: ' + error);
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
                onClick={() =>
                showModal(<Settings  fileBrowserManager={fileBrowserManager} />, window)}
              >
              Go to Settings
              </ButtonItem>
            </PanelSectionRow>
            <PanelSectionRow>
                {/* style={{
                  display: "flex",
                  width: "100%",
                  boxShadow: "none",
                  alignItems: "end",
                  justifyContent: "flex-end"
                }}> */}
                <DialogButton
                  style={{ height: "28px", width: "40px", minWidth: 0, padding: "10px 12px" }}
                  onClick={() =>
                    showModal(<About />, window)}
                >
                <BsExclamationCircleFill style={{ marginTop: "-4px", display: "block" }} />
              </DialogButton>
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
              Port: { Number(port) }
            </PanelSectionRow>
          )
        }
      </PanelSection>
      <PanelSection title={ "Information" }>
        <PanelSectionRow>
          Make sure your SteamDeck and the devices you are accessing the files with are on the same network.
        </PanelSectionRow>
      </PanelSection>
    </>
  );
};

export default definePlugin(() => {
  const fileBrowserManager = new FileBrowserManager();

  return {
    name: "DeckyFileBrowser",
    titleView: <div className={staticClasses.Title}>DeckyFileBrowser</div>,
    version: "1.5.0",
    content: (
      <AppContextProvider fileBrowserManager={fileBrowserManager} >
        <Content />
      </AppContextProvider>
    ),
    icon: <FaServer />,
    onDismount: () => {
    }
  };
});
