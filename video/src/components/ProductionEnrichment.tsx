import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {POPPINS} from '../fonts';

type Row = {label:string; detail:string; value?:number};
type Graphic = {segmentIndex:number; kind:'flow'|'table'|'bar'; title:string; rows:Row[]; source:string; takeaway:string; unit?:string; period?:string};
type Cue = {segmentIndex:number; src:string; sourceStartSeconds:number; durationSeconds:number; gain:number};
export type ProductionEnrichment = {version:number; sha256:string; graphics:Graphic[]; soundEffects:Cue[]};

export const ProductionEnrichmentLayer:React.FC<{plan:ProductionEnrichment; segmentIndex:number}> = ({plan,segmentIndex}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const graphic = plan.graphics.find(item => item.segmentIndex === segmentIndex);
  const cues = plan.soundEffects.filter(item => item.segmentIndex === segmentIndex);
  const opacity = interpolate(frame, [12,24,durationInFrames-12,durationInFrames], [0,1,1,0], {extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  return <>
    {cues.map((cue,index) => <Sequence key={index} from={12} durationInFrames={Math.round(cue.durationSeconds*fps)}>
      <Audio src={staticFile(cue.src)} startFrom={Math.round(cue.sourceStartSeconds*fps)} volume={localFrame => cue.gain * Math.min(1,localFrame/3,(cue.durationSeconds*fps-localFrame)/5)} />
    </Sequence>)}
    {graphic && <AbsoluteFill style={{opacity,pointerEvents:'none'}}>
      <div style={{position:'absolute',left:72,right:72,top:640,padding:38,background:'#041018',border:'2px solid #58d6ff',borderRadius:24,fontFamily:POPPINS,color:'#ffffff'}}>
        <div style={{fontSize:34,fontWeight:700,marginBottom:24}}>{graphic.title}</div>
        {graphic.rows.map((row,index) => {
          const reveal = interpolate(frame,[24+index*6,36+index*6],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
          const maximum = Math.max(...graphic.rows.map(item => item.value ?? 0),1);
          return <div key={index} style={{opacity:reveal,transform:`translateY(${(1-reveal)*16}px)`,padding:'12px 0',borderTop:index?'1px solid #ffffff30':undefined}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1.3fr',gap:20,fontSize:27,overflowWrap:'anywhere'}}><span>{graphic.kind==='flow'?`${index+1}. `:''}{row.label}</span><span style={{color:'#afc6cf'}}>{graphic.kind==='bar'?`${row.value} ${graphic.unit}`:row.detail}</span></div>
            {graphic.kind==='bar'&&<div style={{height:12,background:'#ffffff20',marginTop:10}}><div style={{height:12,width:`${100*(row.value??0)/maximum*reveal}%`,background:'#58d6ff'}}/></div>}
          </div>;
        })}
        <div style={{fontSize:25,color:'#58d6ff',marginTop:22}}>{graphic.takeaway}</div>
        <div style={{fontSize:18,color:'#afc6cf',marginTop:12}}>{graphic.source}{graphic.period?` · ${graphic.period}`:''}</div>
      </div>
    </AbsoluteFill>}
  </>;
};
