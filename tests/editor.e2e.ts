import {readFile} from 'node:fs/promises';
import JSZip from 'jszip';
import {parseGIF,decompressFrames} from 'gifuct-js';
import {test} from '@e2e-dev/web';
import {expect} from 'e2e';

for(const width of [1280,390])test(`still-image controls and real PNG export at ${width}px`,async({app,browser,screen})=>{
 await browser.setViewport({width,height:1000});
 await browser.emulateMedia({reducedMotion:'reduce'});
 await app.open('/');
 await browser.locator('input[type="file"]').setInputFiles('tests/.fixtures/bright.svg');
 await expect(screen.getByRole('button','Download PNG',{exact:true})).toBeVisible();
 await screen.getByRole('tab','Rounded Corners',{exact:true}).click();
 await screen.getByRole('button','Use light preview background',{exact:true}).click();
 const download=await browser.waitForDownload(()=>screen.getByRole('button','Download PNG',{exact:true}).click());
 const bytes=await readFile(download.absolutePath);
 expect(bytes.subarray(1,4).toString()).toBe('PNG');
 expect([bytes.readUInt32BE(16),bytes.readUInt32BE(20)]).toEqual([64,48]);
 const pixels=await browser.evaluate(async(encoded)=>{
  const data=Uint8Array.from(atob(encoded),character=>character.charCodeAt(0));
  const url=URL.createObjectURL(new Blob([data],{type:'image/png'}));
  try{
   const image=new Image();image.src=url;await image.decode();
   const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
   const context=canvas.getContext('2d')!;context.drawImage(image,0,0);
   return {corner:Array.from(context.getImageData(0,0,1,1).data),center:Array.from(context.getImageData(32,24,1,1).data)};
  }finally{URL.revokeObjectURL(url);}
 },bytes.toString('base64'));
 expect(pixels.corner[3]).toBe(0);
 expect(pixels.center).toEqual([255,128,64,255]);
 expect(await browser.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('batch export contains both rendered PNGs',async({app,browser,screen})=>{
 await app.open('/');
 await browser.locator('input[type="file"]').setInputFiles(['tests/.fixtures/bright.svg','tests/.fixtures/other.svg']);
 await expect(screen.getByRole('button','Download All (2)',{exact:true})).toBeVisible();
 const download=await browser.waitForDownload(()=>screen.getByRole('button','Download All (2)',{exact:true}).click());
 const zip=await JSZip.loadAsync(await readFile(download.absolutePath));
 const names=Object.keys(zip.files).sort();
 expect(names).toEqual(['export-1-bright.png','export-2-other.png']);
 const first=await zip.files[names[0]].async('nodebuffer');
 const second=await zip.files[names[1]].async('nodebuffer');
 expect([first.readUInt32BE(16),first.readUInt32BE(20)]).toEqual([64,48]);
 expect([second.readUInt32BE(16),second.readUInt32BE(20)]).toEqual([32,32]);
});

test('animated GIF export retains multiple frames',async({app,browser,screen})=>{
 await app.open('/');
 await browser.locator('input[type="file"]').setInputFiles('tests/.fixtures/animated.gif');
 await expect(screen.getByRole('button','Download GIF',{exact:true})).toBeVisible();
 const previewColor=()=>browser.evaluate(()=>{
  const canvas=document.querySelector('canvas[style*="touch-action"]') as HTMLCanvasElement;
  return Array.from(canvas.getContext('2d')!.getImageData(canvas.width/2,canvas.height/2,1,1).data).slice(0,3).join(',');
 });
 await expect.poll(previewColor).toMatch(/^(255,0,0|0,0,255)$/);
 const initialColor=await previewColor();
 await expect.poll(previewColor).not.toBe(initialColor);
 const download=await browser.waitForDownload(()=>screen.getByRole('button','Download GIF',{exact:true}).click());
 const bytes=await readFile(download.absolutePath);
 expect(bytes.subarray(0,3).toString()).toBe('GIF');
 const frames=decompressFrames(parseGIF(new Uint8Array(bytes).buffer),true);
 expect(frames.length).toBe(2);
 expect(frames[0].dims.width).toBe(16);
 expect(frames[0].dims.height).toBe(16);
});

test('invalid upload recovers and clearing removes source object URLs',async({app,browser,screen})=>{
 await browser.addInitScript(()=>{
  const original=URL.createObjectURL.bind(URL);const urls:string[]=[];
  Object.assign(window,{__qaSourceUrls:urls});
  URL.createObjectURL=(value)=>{const url=original(value);if(value instanceof File)urls.push(url);return url;};
 });
 await app.open('/');
 await browser.locator('input[type="file"]').setInputFiles('tests/.fixtures/broken.svg');
 await expect(screen.getByText(/Couldn't decode that image/)).toBeVisible();
 await browser.locator('input[type="file"]').setInputFiles('tests/.fixtures/bright.svg');
 await expect(screen.getByRole('button','Download PNG',{exact:true})).toBeVisible();
 await screen.getByRole('button','Clear All',{exact:true}).click();
 await expect(screen.getByRole('button','Select images or GIFs',{exact:true})).toBeVisible();
 const revoked=await browser.evaluate(async()=>Promise.all((window as unknown as {__qaSourceUrls:string[]}).__qaSourceUrls.map(async url=>{try{await fetch(url);return false;}catch{return true;}})));
 expect(revoked).toEqual([true,true]);
});
