import { loadFont as loadBebasNeue } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";

export const { fontFamily: BEBAS } = loadBebasNeue();
export const { fontFamily: POPPINS } = loadPoppins("normal", { weights: ["400", "600"] });
