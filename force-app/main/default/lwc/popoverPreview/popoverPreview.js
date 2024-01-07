import { LightningElement, track } from 'lwc';

export default class PopoverPreview extends LightningElement {
    @track showPopver = false;
    show() {
        this.showPopver = true;
    }
    hide() {
        this.showPopver = false;
    }
    handleClose() {
        this.showPopver = false;
    }
}