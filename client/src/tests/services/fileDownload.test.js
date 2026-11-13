import api from '../../services/api';
import {downloadProjectFile} from '../../services/fileDownload';
jest.mock('../../services/api',()=>({__esModule:true,default:{get:jest.fn()}}));
test('private download uses authenticated API blob access and releases its object URL',async()=>{
 jest.useFakeTimers();const blob=new Blob(['synthetic']);api.get.mockResolvedValue({data:blob});
 URL.createObjectURL=jest.fn(()=> 'blob:synthetic-file');URL.revokeObjectURL=jest.fn();
 const click=jest.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
 try{await downloadProjectFile('file-a','handover.txt');expect(api.get).toHaveBeenCalledWith('/files/download/file-a',{responseType:'blob'});expect(URL.createObjectURL).toHaveBeenCalledWith(blob);expect(click).toHaveBeenCalledTimes(1);jest.runAllTimers();expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:synthetic-file');}
 finally{click.mockRestore();jest.useRealTimers();}
});
