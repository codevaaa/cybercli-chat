import browserMark from '../../../../chrome-extension/assets/icons/codeva-mark.svg'
export default function BrowserMark({ size = 44, className = '' }) {
  return <img src={browserMark} width={size} height={size} className={className} alt="Codeva browser workspace" />
}
