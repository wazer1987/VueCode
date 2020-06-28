//遍历模板 将里面的插值表达式解析 (双{{}})
//如果有w-开头 @开头 做特别的处理
class Compile {
    constructor(el,vm){
        this.$vm = vm
        this.$el = document.querySelector(el)
        if(this.$el){
            // 将$el中的内容搬到一个fragment()  这里就是一个文档的集合 里面是你所有移动的子节点
            this.$fragment = this.node2Fragment(this.$el)
            
            // 编译fragment 也就是开始递归遍历 解析我们的指令和插值表达式
            this.compile(this.$fragment)

            //将编译的结果(也就是我们处理完的那些DOM节点和元素 插入到宿主中 也就是$el)
            this.$el.appendChild(this.$fragment)
        } 
    }
    //遍历el 把里面的内容搬到 fragment中
    node2Fragment(el){
        const fragment = document.createDocumentFragment()
        let child 
        //这里就相当于搬家
        while (child = el.firstChild) {
            //这个while循环 一直能够进行 可以理解我 我们这是搬家的操作 每次把el中第一个
            //元素抽出来 放到 fragment 然后el中的第二个元素 又变成了第一个
            fragment.appendChild(child)
            
        }
        return fragment
    }
    compile(el){
        //这里拿到了 el下面的所有节点 又的是 文本节点 有的是元素节点  这里获取到的是一个伪数组
        const childNodes = el.childNodes
        //把获取到的节点伪数组 进行遍历 根据他的类型分别去判断
        Array.from(childNodes).forEach( node => {
            if(this.isElement(node)){
                //如果是元素节点 就解析 他身上的以w-开头 或者 @开头的指令
                this.compileElement(node)
            }else if (this.isInterpolation(node)){
                //如果是文本节点就解析 看看有每有{{xxx}}的然后 把值替换成我们Wvue里的变量 创建watcher
                //把插值表达式 替换为实际的内容
                this.compileText(node)
            }

            //如果每个元素身上还有节点 就递归遍历
            if(node.childNodes && node.childNodes.length > 0){
                this.compile(node)
            }
        })
    }
    //如果是元素节点 就解析 他身上的以w-开头 或者 @开头的指令
    isElement(node){
        
        return node.nodeType === 1
    }
    //遍历元素节点 把标签上的 所有我们的属性取出来
    compileElement(node){
        //查看node的属性 是否有w-开头 或者@
        const nodeAttrs = node.attributes // 这里nodeAttrs获取到的是一个对象
        Array.from(nodeAttrs).forEach(attr => {
            //这里的attr 就是w-text="xxx" 或者w-html @之类的
            const attrName = attr.name //这里获取到的是你的执行 比如w-text w-html
            const exp = attr.value //这里是你获取到的那个w-text="xxx" 里的xxx也就是你data中的变量
            console.log(attrName,'----attrName',exp,'-----exp')
            //开始截取指令
            if(attrName.indexOf('w-') === 0){
                const dir = attrName.substring(2) //把w-text 的 text截取出来 做动态参数 好动态调取我们的方法
                //调取通用函数 执行我们的把文本内容替换 这调用了 text方法 然后text方法有执行了updated 在updated里
                //执行了 textUpdator 方法  把 内容替换调了
                this[dir] && this[dir](node,this.$vm,exp)
            }else if(attrName.indexOf('@') === 0){
                //开始截取事件名 然后编写执行的函数
                 const eventName = attrName.substring(1)
                 this.eventHandler(node,this.$vm,exp,eventName)
            }
        })      
    }
    //处理@开头的指令相关
    eventHandler(node,vm,exp,eventName){
        //如果你methods里有事件 我就去监听一下 然后执行你的事件回调
        const fn = vm.$options.methods && vm.$options.methods[exp]
        if(eventName && fn){
            //为你绑定的元素添加事件 并且执行methods的方法 为了防止this出问题 这里要bind一下
            node.addEventListener(eventName,fn.bind(vm))
        }
    }
    //w-text的指令执行的方法
    text(node,vm,exp){
        this.updated(node,vm,exp,'text')
    }
    //v-model指令执行的方法
    model(node,vm,exp){
        //值变了改界面 node是当前的节点 vm是Vue的实例 exp是data里的键
        this.updated(node,vm,exp,'model')
        //页面变了 改值 这里可能还有chage之类 
        node.addEventListener('input',e => {
            vm[exp] = e.target.value
        })
    }
    //值变了改页面 这的node多半的input框
    modelUpdator(node,value){
        node.value = value
    }
    //html方法
    html(node,vm,exp){
        this.updated(node,vm,exp,'html')
    }
    htmlUpdator(node,value){
        node.innerHTML = value
    }
    //解析文本节点 看看有每有{{xxx}}的然后 把值替换成我们Wvue里的变量 创建watcher
    isInterpolation(node){
        //如果你的文本类型 是3 就说明你是文本节点 并且要满足正则匹配 你里面有{{}}的语法 
        return node.nodeType === 3 && /\{\{(.*)\}\}/.test(node.textContent)
    }
    compileText(node){
        //RegExp.$1 就是你 {{xxx}} 里匹配的xxx的部分
        //这里的this.vm就是你的Vue实例 由于我们这里做了无中间的data的this访问 所以可以通过这样的形式 去拿到 你data里的变量的值
        //然后把里面的内容替换成我们Vue实例data里定义的变量的值
        // node.textContent = this.$vm[RegExp.$1]
        const exp = RegExp.$1 //把变量都取出来
        this.updated(node,this.$vm,exp,'text')
    }
    updated (node,vm,exp,dir) {
        //这里我们可能是解析{{}} 也可能是解析 w-text 或者 w-html 这里我们写一个通用的函数 通过传参去匹配调用
        const fn = this[dir + 'Updator']
        //调用我们的textUpdator 函数 把界面上的{{xxx}}替换为我们的Vue实例中的data里的变量的键值
        fn && fn(node,vm[exp])
        //创建watcher 并且 把我们的{{xxx}}的替换内容的函数传进去
        new Watcher(vm,exp,function(){
            fn && fn(node,vm[exp])
        })
    }
    textUpdator(node,value){
        //替换界面中的{{}}里面的内容 为我们Vue里面data里面的键值
        node.textContent = value
    }
}