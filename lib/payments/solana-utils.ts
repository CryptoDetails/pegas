const ALPHABET="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export function decodeBase58(input:string,label="base58 value"){
  const bytes=[0];
  for(const ch of input){
    const value=ALPHABET.indexOf(ch);if(value<0)throw new Error(`${label} is not valid base58`);
    let carry=value;
    for(let j=0;j<bytes.length;j++){carry+=bytes[j]*58;bytes[j]=carry&255;carry>>=8;}
    while(carry){bytes.push(carry&255);carry>>=8;}
  }
  for(let i=0;i<input.length-1&&input[i]==="1";i++)bytes.push(0);
  return Uint8Array.from(bytes.reverse());
}
export function isSolanaPublicKey(value:string){try{return decodeBase58(value,"Solana public key").length===32}catch{return false}}
