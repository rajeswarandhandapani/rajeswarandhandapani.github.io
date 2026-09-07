const fs=require('node:fs');
const path=require('node:path');
const output='site-output';
fs.mkdirSync(output,{recursive:true});
for(const entry of ['index.html','assets','games','.nojekyll']) fs.cpSync(entry,path.join(output,entry),{recursive:true});
let count=0;
for(const game of fs.readdirSync('games')){
 const page=path.join('games',game,'index.html');if(!fs.existsSync(page))continue;
 const html=fs.readFileSync(page,'utf8');
 for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){
  const target=match[1].split(/[?#]/)[0];if(!target||/^(https?:|data:)/.test(target))continue;
  if(!fs.existsSync(path.resolve(path.dirname(page),target)))throw Error(`Broken asset in ${page}: ${target}`);
 }
 count++;
}
console.log(`Built ${count} games and the learning library to ${output}/`);
