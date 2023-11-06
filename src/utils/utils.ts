export function getBase64(file: File) {
	// let me = this;
	// let file = event.target.files[0];
	let reader = new FileReader();
	reader.readAsDataURL(file);
	reader.onload = function (): string {
		//me.modelvalue = reader.result;
		console.log(reader.result);
		return reader.result as string;
	};
	reader.onerror = function (error) {
		console.log("Error: ", error);
	};
}
