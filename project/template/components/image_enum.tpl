		<!-- Params: seq, index, caption -->
		{{ @tpl "components/image.tpl" imgProps }}
		<w:p w14:paraId="20D1F7EF" w14:textId="77E5CA90" w:rsidR="00422AF1" w:rsidRDefault="00422AF1" w:rsidP="00422AF1">
			<w:pPr>
				<w:pStyle w:val="Descripcin"/>
			</w:pPr>
			<w:bookmarkStart w:id="167" w:name="_Toc104228345"/>
			<w:r w:rsidRPr="008B541D">
				<w:t xml:space="preserve">{{ imgProps.seq }} </w:t>
			</w:r>
			<w:r w:rsidRPr="008B541D">
				<w:fldChar w:fldCharType="begin"/>
			</w:r>
			<w:r w:rsidRPr="008B541D">
				<w:instrText xml:space="preserve"> SEQ {{ imgProps.seq }} \* ARABIC </w:instrText>
			</w:r>
			<w:r w:rsidRPr="008B541D">
				<w:fldChar w:fldCharType="separate"/>
			</w:r>
			<w:r w:rsidR="00566C29">
				<w:rPr>
					<w:noProof/>
				</w:rPr>
				<w:t>{{ index }}</w:t>
			</w:r>
			<w:r w:rsidRPr="008B541D">
				<w:fldChar w:fldCharType="end"/>
			</w:r>
			<w:r w:rsidRPr="008B541D">
				<w:t xml:space="preserve"> - </w:t>
			</w:r>
			<w:r w:rsidR="00FE7135">
				<w:t>{{ caption }}</w:t>
			</w:r>
			<w:bookmarkEnd w:id="167"/>
			<w:r w:rsidRPr="008B541D">
				<w:t xml:space="preserve"> </w:t>
			</w:r>
		</w:p>
