import { VFC } from "react";
import {
  ModalRoot,
  DialogHeader,
  DialogBody,
  DialogSubHeader
} from "@decky/ui";

const About: VFC<{  closeModal?: () => void }> =  ( { closeModal } ) => {

  return (
    <ModalRoot closeModal={closeModal}>
      <DialogHeader>About</DialogHeader>
      <DialogSubHeader>Author</DialogSubHeader>
        <DialogBody>
          William Barrence
        </DialogBody>
        <DialogSubHeader>Creator</DialogSubHeader>
        <DialogBody>
          Heyde Moura
        </DialogBody>
    </ModalRoot>
  );
};

export default About;
